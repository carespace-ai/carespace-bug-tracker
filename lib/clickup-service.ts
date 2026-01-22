import axios from 'axios';
import { EnhancedBugReport } from './types';
import FormData from 'form-data';
import { retryWithBackoff } from './retry-handler';
import { executeWithCircuitBreaker } from './circuit-breaker';

const CLICKUP_API_URL = 'https://api.clickup.com/api/v2';
const apiKey = process.env.CLICKUP_API_KEY || '';
const listId = process.env.CLICKUP_LIST_ID || '';
const CIRCUIT_BREAKER_SERVICE_NAME = 'clickup';

interface ClickUpTaskResponse {
  id: string;
  url: string;
}

export async function createClickUpTask(
  enhancedReport: EnhancedBugReport,
  githubIssueUrl: string | undefined,
  files?: File[]
): Promise<string> {
  // Build attachments section if files are provided
  const attachmentsSection = files && files.length > 0
    ? `\n### Attachments\n${files.map(f => `- ${f.name} (${(f.size / 1024).toFixed(2)} KB)`).join('\n')}\n`
    : '';

  // Handle case where GitHub URL might be undefined
  const githubSection = githubIssueUrl
    ? `**GitHub Issue**: ${githubIssueUrl}\n\n`
    : `**GitHub Issue**: Not created (GitHub service unavailable)\n\n`;

  const taskDescription = `## Bug Report from Customer

${githubSection}### Description
${enhancedReport.enhancedDescription}

### Technical Context
${enhancedReport.technicalContext}

### Environment
- Severity: ${enhancedReport.severity}
- Category: ${enhancedReport.category}
- Environment: ${enhancedReport.environment || 'Not provided'}
- Browser: ${enhancedReport.browserInfo || 'Not provided'}
${attachmentsSection}
### Claude Code Prompt
\`\`\`
${enhancedReport.claudePrompt}
\`\`\``;

  try {
    const response = await executeWithCircuitBreaker(
      CIRCUIT_BREAKER_SERVICE_NAME,
      () => retryWithBackoff(
        () => axios.post<ClickUpTaskResponse>(
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
        )
      )
    );

    const taskId = response.data.id;
    const taskUrl = response.data.url;

    // Upload files if provided
    if (files && files.length > 0) {
      await uploadFilesToClickUpTask(taskId, files);
    }

    return taskUrl;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create ClickUp task: ${error.message}`);
    }
    throw new Error('Failed to create ClickUp task');
  }
}

/**
 * Uploads files to a ClickUp task as attachments
 * @param taskId - The ClickUp task ID
 * @param files - Array of File objects to attach
 */
export async function uploadFilesToClickUpTask(
  taskId: string,
  files: File[]
): Promise<void> {
  if (!files || files.length === 0) {
    return;
  }

  try {
    // Upload each file sequentially to avoid rate limiting
    for (const file of files) {
      const formData = new FormData();

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Append file to FormData with proper filename
      formData.append('attachment', buffer, {
        filename: file.name,
        contentType: file.type,
      });

      // Upload file to ClickUp task with retry and circuit breaker
      await executeWithCircuitBreaker(
        CIRCUIT_BREAKER_SERVICE_NAME,
        () => retryWithBackoff(
          () => axios.post(
            `${CLICKUP_API_URL}/task/${taskId}/attachment`,
            formData,
            {
              headers: {
                Authorization: apiKey,
                ...formData.getHeaders(),
              },
            }
          )
        )
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to upload files to ClickUp task: ${error.message}`);
    }
    throw new Error('Failed to upload files to ClickUp task');
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: string
): Promise<void> {
  try {
    await executeWithCircuitBreaker(
      CIRCUIT_BREAKER_SERVICE_NAME,
      () => retryWithBackoff(
        () => axios.put(
          `${CLICKUP_API_URL}/task/${taskId}`,
          { status },
          {
            headers: {
              Authorization: apiKey,
              'Content-Type': 'application/json',
            },
          }
        )
      )
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to update ClickUp task status: ${error.message}`);
    }
    throw new Error('Failed to update ClickUp task status');
  }
}
