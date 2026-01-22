import Anthropic from '@anthropic-ai/sdk';
import { BugReport, EnhancedBugReport } from './types';
import { sanitizeBugReportForPrompt } from './prompt-sanitizer';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  timeout: 60000, // 60 seconds timeout for API requests
  maxRetries: 3, // Retry up to 3 times with exponential backoff
});

export async function enhanceBugReport(bugReport: BugReport): Promise<EnhancedBugReport> {
  // Sanitize input to prevent prompt injection attacks
  const sanitized = sanitizeBugReportForPrompt(bugReport);

  const prompt = `You are a technical bug report analyzer. Enhance the following bug report with:
1. A clear, detailed technical description
2. Suggested GitHub labels (max 5)
3. Technical context for developers
4. A specific prompt for Claude Code to fix this issue
5. Priority score (1-5, where 5 is critical)

Bug Report:
Title: ${sanitized.title}
Description: ${sanitized.description}
Steps to Reproduce: ${sanitized.stepsToReproduce || 'Not provided'}
Expected Behavior: ${sanitized.expectedBehavior || 'Not provided'}
Actual Behavior: ${sanitized.actualBehavior || 'Not provided'}
Severity: ${sanitized.severity}
Category: ${sanitized.category}
Environment: ${sanitized.environment || 'Not provided'}
Browser: ${sanitized.browserInfo || 'Not provided'}

Respond in JSON format:
{
  "enhancedDescription": "detailed technical description",
  "suggestedLabels": ["label1", "label2"],
  "technicalContext": "context for developers",
  "claudePrompt": "specific prompt for Claude Code",
  "priority": 3
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const enhanced = JSON.parse(jsonMatch[0]);

    return {
      ...bugReport,
      enhancedDescription: enhanced.enhancedDescription,
      suggestedLabels: enhanced.suggestedLabels,
      technicalContext: enhanced.technicalContext,
      claudePrompt: enhanced.claudePrompt,
      priority: enhanced.priority
    };
  } catch (error) {
    // Check if this is a timeout error
    const isTimeout = error instanceof Error && (
      error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('timed out')
    );

    if (isTimeout) {
      // Request timeout - falling back to basic enhancement
    } else {
      // Error enhancing bug report - falling back to basic enhancement
    }

    // Fallback to basic enhancement
    return {
      ...bugReport,
      enhancedDescription: bugReport.description,
      suggestedLabels: [bugReport.category, bugReport.severity],
      technicalContext: `Category: ${bugReport.category}, Severity: ${bugReport.severity}`,
      claudePrompt: `Fix the following issue: ${bugReport.title}. ${bugReport.description}`,
      priority: bugReport.severity === 'critical' ? 5 : bugReport.severity === 'high' ? 4 : 3
    };
  }
}
