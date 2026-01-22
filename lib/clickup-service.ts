import axios from 'axios';
import { EnhancedBugReport } from './types';

const CLICKUP_API_URL = 'https://api.clickup.com/api/v2';
const apiKey = process.env.CLICKUP_API_KEY || '';
const listId = process.env.CLICKUP_LIST_ID || '';

interface ClickUpTaskResponse {
  id: string;
  url: string;
}

export async function createClickUpTask(
  enhancedReport: EnhancedBugReport,
  githubIssueUrl: string
): Promise<string> {
  const taskDescription = `## Bug Report from Customer

**GitHub Issue**: ${githubIssueUrl}

### Description
${enhancedReport.enhancedDescription}

### Technical Context
${enhancedReport.technicalContext}

### Environment
- Severity: ${enhancedReport.severity}
- Category: ${enhancedReport.category}
- Environment: ${enhancedReport.environment || 'Not provided'}
- Browser: ${enhancedReport.browserInfo || 'Not provided'}

### Claude Code Prompt
\`\`\`
${enhancedReport.claudePrompt}
\`\`\``;

  try {
    const response = await axios.post<ClickUpTaskResponse>(
      `${CLICKUP_API_URL}/list/${listId}/task`,
      {
        name: `[BUG] ${enhancedReport.title}`,
        description: taskDescription,
        priority: enhancedReport.priority,
        tags: enhancedReport.suggestedLabels,
        status: 'to do',
      },
      {
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.url;
  } catch (error) {
    console.error('Error creating ClickUp task:', error);
    throw new Error('Failed to create ClickUp task');
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: string
): Promise<void> {
  try {
    await axios.put(
      `${CLICKUP_API_URL}/task/${taskId}`,
      { status },
      {
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error updating ClickUp task status:', error);
    throw new Error('Failed to update ClickUp task status');
  }
}
