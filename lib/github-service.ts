import { Octokit } from '@octokit/rest';
import { EnhancedBugReport, GitHubIssue } from './types';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.GITHUB_OWNER || '';
const defaultRepo = process.env.GITHUB_REPO || '';

// Repository configuration
const REPOS = {
  frontend: process.env.GITHUB_REPO_FRONTEND || 'carespace-frontend',
  backend: process.env.GITHUB_REPO_BACKEND || 'carespace-backend',
  attachments: defaultRepo || 'carespace-bug-tracker' // Keep using bug tracker repo for attachments
};

/**
 * Uploads a file to the GitHub repository and returns its raw URL
 * @param fileContent - Buffer containing the file content
 * @param filename - Original filename
 * @param correlationId - Optional correlation ID for request tracing
 * @returns Raw GitHub URL to the uploaded file
 */
export async function uploadFileToGitHub(
  fileContent: Buffer,
  filename: string,
  correlationId?: string
): Promise<string> {
  const logPrefix = correlationId ? `[GitHub] [reqId: ${correlationId}]` : '[GitHub]';

  // Validate environment variables
  if (!owner) {
    throw new Error('GITHUB_OWNER environment variable is not configured');
  }
  if (!REPOS.attachments) {
    throw new Error('GITHUB_REPO environment variable is not configured');
  }
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable is not configured');
  }

  try {
    // Create a unique path using timestamp to avoid conflicts
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filepath = `bug-attachments/${timestamp}-${sanitizedFilename}`;

    // Convert file content to base64 as required by GitHub API
    const content = fileContent.toString('base64');

    console.log(`${logPrefix} Uploading file to ${owner}/${REPOS.attachments}/${filepath}`);

    // Upload file to repository (using attachments repo)
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo: REPOS.attachments,
      path: filepath,
      message: `Upload bug report attachment: ${filename}`,
      content,
    });

    // Get the SHA of the uploaded file to construct the raw URL
    const sha = response.data.content?.sha;
    if (!sha) {
      throw new Error('Failed to get file SHA from GitHub response');
    }

    // Return the raw content URL
    // Format: https://raw.githubusercontent.com/{owner}/{repo}/main/{filepath}
    const branch = 'main'; // Default branch, could be made configurable
    return `https://raw.githubusercontent.com/${owner}/${REPOS.attachments}/${branch}/${filepath}`;
  } catch (error) {
    console.error(`${logPrefix} Error uploading file to GitHub:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to upload file to GitHub: ${errorMessage}`);
  }
}

/**
 * Uploads multiple files to GitHub repository
 * @param files - Array of File objects from FormData
 * @param correlationId - Optional correlation ID for request tracing
 * @returns Array of attachment objects with name, size, type, and GitHub URL
 */
export async function uploadFilesToGitHub(
  files: File[],
  correlationId?: string
): Promise<{ name: string; size: number; type: string; url: string }[]> {
  const uploadPromises = files.map(async (file) => {
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file and get URL
    const url = await uploadFileToGitHub(buffer, file.name, correlationId);

    return {
      name: file.name,
      size: file.size,
      type: file.type,
      url,
    };
  });

  // Upload all files in parallel
  return Promise.all(uploadPromises);
}

export async function createGitHubIssue(enhancedReport: EnhancedBugReport, correlationId?: string): Promise<string> {
  const logPrefix = correlationId ? `[GitHub] [reqId: ${correlationId}]` : '[GitHub]';

  // Determine target repository based on AI analysis
  const targetRepo = REPOS[enhancedReport.targetRepo];
  console.log(`${logPrefix} Creating issue in repository: ${owner}/${targetRepo} (${enhancedReport.targetRepo})`);

  // Format attachments section
  let attachmentsSection = '';
  if (enhancedReport.attachments && enhancedReport.attachments.length > 0) {
    attachmentsSection = '\n### Attachments\n' +
      enhancedReport.attachments
        .map(att => `- [${att.name}](${att.url}) (${(att.size / 1024).toFixed(2)} KB)`)
        .join('\n');
  }

  const issueBody = `## 🐛 Bug Report

### Description
${enhancedReport.enhancedDescription}

### Root Cause Hypothesis
${enhancedReport.rootCauseHypothesis}

### Codebase Context
${enhancedReport.codebaseContext}

---

## Behavior Analysis

### Expected Behavior
${enhancedReport.enhancedExpectedBehavior}

### Actual Behavior
${enhancedReport.enhancedActualBehavior}

### Gap Analysis
${enhancedReport.gapAnalysis}

---

## Reproduction Steps
${enhancedReport.stepsToReproduce || 'Not provided'}
${attachmentsSection}

---

## Technical Context
${enhancedReport.technicalContext}

### Environment
- **Severity**: ${enhancedReport.severity}
- **Category**: ${enhancedReport.category}
- **Priority**: ${enhancedReport.priority}/5
- **Repository**: ${enhancedReport.targetRepo}
- **Environment**: ${enhancedReport.environment || 'Not provided'}
- **Browser**: ${enhancedReport.browserInfo || 'Not provided'}
${enhancedReport.userEmail ? `- **Reporter**: ${enhancedReport.userEmail}` : ''}

---

## 🤖 Claude Code Fix Instructions
\`\`\`
${enhancedReport.claudePrompt}
\`\`\`

---
*This issue was automatically created from a customer bug report, enhanced with AI analysis, and routed to the ${enhancedReport.targetRepo} repository.*`;

  try {
    const response = await octokit.issues.create({
      owner,
      repo: targetRepo,
      title: enhancedReport.title,
      body: issueBody,
      labels: enhancedReport.suggestedLabels,
    });

    console.log(`${logPrefix} Successfully created issue in ${owner}/${targetRepo}: ${response.data.html_url}`);
    return response.data.html_url;
  } catch (error) {
    console.error(`${logPrefix} Error creating GitHub issue in ${owner}/${targetRepo}:`, error);
    throw new Error(`Failed to create GitHub issue in ${targetRepo} repository`);
  }
}

export async function addCommentToIssue(
  issueNumber: number,
  comment: string,
  targetRepo: 'frontend' | 'backend' = 'frontend',
  correlationId?: string
): Promise<void> {
  const logPrefix = correlationId ? `[GitHub] [reqId: ${correlationId}]` : '[GitHub]';
  const repo = REPOS[targetRepo];

  try {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: comment
    });
  } catch (error) {
    console.error(`${logPrefix} Error adding comment to issue in ${owner}/${repo}:`, error);
    throw new Error(`Failed to add comment to GitHub issue in ${targetRepo} repository`);
  }
}
