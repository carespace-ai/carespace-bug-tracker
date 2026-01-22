import { Octokit } from '@octokit/rest';
import { EnhancedBugReport, GitHubIssue } from './types';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.GITHUB_OWNER || '';
const repo = process.env.GITHUB_REPO || '';

export async function createGitHubIssue(enhancedReport: EnhancedBugReport): Promise<string> {
  const issueBody = `## Bug Report

### Description
${enhancedReport.enhancedDescription}

### Steps to Reproduce
${enhancedReport.stepsToReproduce || 'Not provided'}

### Expected Behavior
${enhancedReport.expectedBehavior || 'Not provided'}

### Actual Behavior
${enhancedReport.actualBehavior || 'Not provided'}

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
    const response = await octokit.issues.create({
      owner,
      repo,
      title: enhancedReport.title,
      body: issueBody,
      labels: enhancedReport.suggestedLabels,
    });

    return response.data.html_url;
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    throw new Error('Failed to create GitHub issue');
  }
}

export async function addCommentToIssue(issueNumber: number, comment: string): Promise<void> {
  try {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: comment
    });
  } catch (error) {
    console.error('Error adding comment to issue:', error);
    throw new Error('Failed to add comment to GitHub issue');
  }
}
