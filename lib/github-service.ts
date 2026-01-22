import { Octokit } from '@octokit/rest';
import { EnhancedBugReport, GitHubIssue } from './types';
import { retryWithBackoff } from './retry-handler';
import { executeWithCircuitBreaker } from './circuit-breaker';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.GITHUB_OWNER || '';
const repo = process.env.GITHUB_REPO || '';

/**
 * Uploads a file to the GitHub repository and returns its raw URL
 * @param fileContent - Buffer containing the file content
 * @param filename - Original filename
 * @returns Raw GitHub URL to the uploaded file
 */
export async function uploadFileToGitHub(
  fileContent: Buffer,
  filename: string
): Promise<string> {
  // Create a unique path using timestamp to avoid conflicts
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filepath = `bug-attachments/${timestamp}-${sanitizedFilename}`;

  // Convert file content to base64 as required by GitHub API
  const content = fileContent.toString('base64');

  try {
    // Execute with circuit breaker and retry logic
    const response = await executeWithCircuitBreaker('github-upload-file', async () => {
      return await retryWithBackoff(async () => {
        return await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: filepath,
          message: `Upload bug report attachment: ${filename}`,
          content,
        });
      });
    });

    // Get the SHA of the uploaded file to construct the raw URL
    const sha = response.data.content?.sha;
    if (!sha) {
      throw new Error('Failed to get file SHA from GitHub response');
    }

    // Return the raw content URL
    // Format: https://raw.githubusercontent.com/{owner}/{repo}/main/{filepath}
    const branch = 'main'; // Default branch, could be made configurable
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filepath}`;
  } catch (error) {
    throw new Error(`Failed to upload file to GitHub: ${filename}`);
  }
}

/**
 * Uploads multiple files to GitHub repository
 * @param files - Array of File objects from FormData
 * @returns Array of attachment objects with name, size, type, and GitHub URL
 */
export async function uploadFilesToGitHub(
  files: File[]
): Promise<{ name: string; size: number; type: string; url: string }[]> {
  const uploadPromises = files.map(async (file) => {
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file and get URL
    const url = await uploadFileToGitHub(buffer, file.name);

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

export async function createGitHubIssue(enhancedReport: EnhancedBugReport): Promise<string> {
  // Format attachments section
  let attachmentsSection = '';
  if (enhancedReport.attachments && enhancedReport.attachments.length > 0) {
    attachmentsSection = '\n### Attachments\n' +
      enhancedReport.attachments
        .map(att => `- [${att.name}](${att.url}) (${(att.size / 1024).toFixed(2)} KB)`)
        .join('\n');
  }

  const issueBody = `## Bug Report

### Description
${enhancedReport.enhancedDescription}

### Steps to Reproduce
${enhancedReport.stepsToReproduce || 'Not provided'}

### Expected Behavior
${enhancedReport.expectedBehavior || 'Not provided'}

### Actual Behavior
${enhancedReport.actualBehavior || 'Not provided'}
${attachmentsSection}

### Technical Context
${enhancedReport.technicalContext}

### Environment
- **Severity**: ${enhancedReport.severity}
- **Category**: ${enhancedReport.category}
- **Environment**: ${enhancedReport.environment || 'Not provided'}
- **Browser**: ${enhancedReport.browserInfo || 'Not provided'}
${enhancedReport.userEmail ? `- **Reporter**: ${enhancedReport.userEmail}` : ''}

---

### 🤖 Claude Code Prompt
\`\`\`
${enhancedReport.claudePrompt}
\`\`\`

---
*This issue was automatically created from a customer bug report.*`;

  try {
    // Execute with circuit breaker and retry logic
    const response = await executeWithCircuitBreaker('github-create-issue', async () => {
      return await retryWithBackoff(async () => {
        return await octokit.issues.create({
          owner,
          repo,
          title: enhancedReport.title,
          body: issueBody,
          labels: enhancedReport.suggestedLabels,
        });
      });
    });

    return response.data.html_url;
  } catch (error) {
    throw new Error('Failed to create GitHub issue');
  }
}

export async function addCommentToIssue(issueNumber: number, comment: string): Promise<void> {
  try {
    // Execute with circuit breaker and retry logic
    await executeWithCircuitBreaker('github-add-comment', async () => {
      return await retryWithBackoff(async () => {
        return await octokit.issues.createComment({
          owner,
          repo,
          issue_number: issueNumber,
          body: comment
        });
      });
    });
  } catch (error) {
    throw new Error('Failed to add comment to GitHub issue');
  }
}
