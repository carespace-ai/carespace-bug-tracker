import { Octokit } from '@octokit/rest';
import { EnhancedBugReport, GitHubIssue } from './types';
import { logger, LogContext } from './logger';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.GITHUB_OWNER || '';
const defaultRepo = process.env.GITHUB_REPO || '';

const REPOS = {
  frontend: process.env.GITHUB_REPO_FRONTEND || 'carespace-ui',
  backend: process.env.GITHUB_REPO_BACKEND || 'carespace-admin',
  attachments: defaultRepo || 'carespace-bug-tracker'
};

function validateGitHubConfig(context: string): void {
  const missing: string[] = [];
  if (!process.env.GITHUB_TOKEN) missing.push('GITHUB_TOKEN');
  if (!owner) missing.push('GITHUB_OWNER');
  if (missing.length > 0) {
    throw new Error(
      `[GitHub] ${context}: Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

function formatGitHubApiError(error: unknown): string {
  if (error instanceof Error) {
    const octokitError = error as Error & {
      status?: number;
      response?: { data?: { message?: string; errors?: unknown[] } };
    };
    const parts: string[] = [];
    if (octokitError.status) parts.push(`HTTP ${octokitError.status}`);
    if (octokitError.response?.data?.message) parts.push(octokitError.response.data.message);
    if (octokitError.response?.data?.errors) {
      parts.push(`Details: ${JSON.stringify(octokitError.response.data.errors)}`);
    }
    if (parts.length > 0) return parts.join(' — ');
    return error.message;
  }
  return String(error);
}

export async function uploadFileToGitHub(
  fileContent: Buffer,
  filename: string,
  correlationId?: string
): Promise<string> {
  const ctx: LogContext = { correlationId: correlationId || 'unknown', service: 'github', operation: 'upload-file' };

  validateGitHubConfig('uploadFileToGitHub');
  if (!REPOS.attachments) {
    throw new Error('GITHUB_REPO environment variable is not configured');
  }

  try {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filepath = `bug-attachments/${timestamp}-${sanitizedFilename}`;
    const content = fileContent.toString('base64');

    logger.info(`Uploading file to ${owner}/${REPOS.attachments}/${filepath}`, ctx);

    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo: REPOS.attachments,
      path: filepath,
      message: `Upload bug report attachment: ${filename}`,
      content,
    });

    const sha = response.data.content?.sha;
    if (!sha) {
      throw new Error('Failed to get file SHA from GitHub response');
    }

    const branch = 'main';
    const url = `https://raw.githubusercontent.com/${owner}/${REPOS.attachments}/${branch}/${filepath}`;
    logger.info('File uploaded successfully', ctx, { url });
    return url;
  } catch (error) {
    const errorDetail = formatGitHubApiError(error);
    logger.error(`Error uploading file to GitHub: ${errorDetail}`, ctx);
    throw new Error(`Failed to upload file to GitHub: ${errorDetail}`);
  }
}

export async function uploadFilesToGitHub(
  files: File[],
  correlationId?: string
): Promise<{ name: string; size: number; type: string; url: string }[]> {
  const uploadPromises = files.map(async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadFileToGitHub(buffer, file.name, correlationId);
    return { name: file.name, size: file.size, type: file.type, url };
  });
  return Promise.all(uploadPromises);
}

export async function createGitHubIssue(enhancedReport: EnhancedBugReport, correlationId?: string): Promise<{ url: string; issueNumber: number }> {
  const ctx: LogContext = { correlationId: correlationId || 'unknown', service: 'github', operation: 'create-issue' };

  validateGitHubConfig('createGitHubIssue');

  const targetRepo = REPOS[enhancedReport.targetRepo];
  if (!targetRepo) {
    throw new Error(`Invalid targetRepo "${enhancedReport.targetRepo}". Expected "frontend" or "backend".`);
  }

  logger.info(`Creating issue in ${owner}/${targetRepo}`, ctx, {
    targetRepo: enhancedReport.targetRepo,
    title: enhancedReport.title,
    labels: enhancedReport.suggestedLabels,
  });

  let attachmentsSection = '';
  if (enhancedReport.attachments && enhancedReport.attachments.length > 0) {
    attachmentsSection = '\n### Attachments\n' +
      enhancedReport.attachments
        .map(att => `- [${att.name}](${att.url}) (${(att.size / 1024).toFixed(2)} KB)`)
        .join('\n');
  }

  const issueBody = `## Bug Report

### Original User Report
> **${enhancedReport.title}**
>
> ${enhancedReport.description}
${enhancedReport.expectedBehavior ? `> \n> **Expected:** ${enhancedReport.expectedBehavior}` : ''}
${enhancedReport.actualBehavior ? `> \n> **Actual:** ${enhancedReport.actualBehavior}` : ''}

---

### AI-Enhanced Description
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

## Claude Code Fix Instructions
\`\`\`
${enhancedReport.claudePrompt}
\`\`\`

---
*This issue was automatically created from a customer bug report, enhanced with AI analysis, and routed to the ${enhancedReport.targetRepo} repository.*`;

  try {
    logger.debug('Sending create issue request to GitHub API', ctx);
    const response = await octokit.issues.create({
      owner,
      repo: targetRepo,
      title: enhancedReport.title,
      body: issueBody,
      labels: enhancedReport.suggestedLabels,
    });

    logger.info(`Issue #${response.data.number} created successfully`, ctx, {
      url: response.data.html_url,
      issueNumber: response.data.number,
    });
    return { url: response.data.html_url, issueNumber: response.data.number };
  } catch (error) {
    const errorDetail = formatGitHubApiError(error);
    logger.error(`Failed to create GitHub issue in ${owner}/${targetRepo}: ${errorDetail}`, ctx);
    throw new Error(`Failed to create GitHub issue in ${owner}/${targetRepo}: ${errorDetail}`);
  }
}

export async function addCommentToIssue(
  issueNumber: number,
  comment: string,
  targetRepo: 'frontend' | 'backend' = 'frontend',
  correlationId?: string
): Promise<void> {
  const ctx: LogContext = { correlationId: correlationId || 'unknown', service: 'github', operation: 'add-comment' };
  const repo = REPOS[targetRepo];

  try {
    await octokit.issues.createComment({ owner, repo, issue_number: issueNumber, body: comment });
  } catch (error) {
    const errorDetail = formatGitHubApiError(error);
    logger.error(`Error adding comment to issue #${issueNumber}: ${errorDetail}`, ctx);
    throw new Error(`Failed to add comment to GitHub issue #${issueNumber}: ${errorDetail}`);
  }
}

export async function getIssueByNumber(
  issueNumber: number,
  targetRepo: 'frontend' | 'backend' = 'frontend',
  correlationId?: string
): Promise<GitHubIssue> {
  const ctx: LogContext = { correlationId: correlationId || 'unknown', service: 'github', operation: 'get-issue' };
  const repo = REPOS[targetRepo];

  try {
    logger.debug(`Fetching issue #${issueNumber} from ${owner}/${repo}`, ctx);
    const response = await octokit.issues.get({ owner, repo, issue_number: issueNumber });
    const issue = response.data;
    return {
      title: issue.title,
      body: issue.body || '',
      labels: issue.labels.map(label => typeof label === 'string' ? label : label.name || ''),
      assignees: issue.assignees?.map(assignee => assignee.login)
    };
  } catch (error) {
    const errorDetail = formatGitHubApiError(error);
    logger.error(`Error fetching issue #${issueNumber}: ${errorDetail}`, ctx);
    throw new Error(`Failed to get GitHub issue #${issueNumber}: ${errorDetail}`);
  }
}

export async function updateIssueStatus(
  issueNumber: number,
  status: 'open' | 'closed',
  targetRepo: 'frontend' | 'backend' = 'frontend',
  correlationId?: string
): Promise<void> {
  const ctx: LogContext = { correlationId: correlationId || 'unknown', service: 'github', operation: 'update-status' };
  const repo = REPOS[targetRepo];

  try {
    logger.info(`Updating issue #${issueNumber} status to '${status}'`, ctx);
    await octokit.issues.update({ owner, repo, issue_number: issueNumber, state: status });
    logger.info(`Issue #${issueNumber} status updated`, ctx);
  } catch (error) {
    const errorDetail = formatGitHubApiError(error);
    logger.error(`Error updating issue #${issueNumber} status: ${errorDetail}`, ctx);
    throw new Error(`Failed to update GitHub issue #${issueNumber} status: ${errorDetail}`);
  }
}

export async function updateIssueLabels(
  issueNumber: number,
  labels: string[],
  targetRepo: 'frontend' | 'backend' = 'frontend',
  correlationId?: string
): Promise<void> {
  const ctx: LogContext = { correlationId: correlationId || 'unknown', service: 'github', operation: 'update-labels' };
  const repo = REPOS[targetRepo];

  try {
    logger.info(`Updating issue #${issueNumber} labels to [${labels.join(', ')}]`, ctx);
    await octokit.issues.update({ owner, repo, issue_number: issueNumber, labels });
    logger.info(`Issue #${issueNumber} labels updated`, ctx);
  } catch (error) {
    const errorDetail = formatGitHubApiError(error);
    logger.error(`Error updating issue #${issueNumber} labels: ${errorDetail}`, ctx);
    throw new Error(`Failed to update GitHub issue #${issueNumber} labels: ${errorDetail}`);
  }
}
