import Anthropic from '@anthropic-ai/sdk';
import { BugReport, EnhancedBugReport } from './types';
import { sanitizeBugReportForPrompt } from './prompt-sanitizer';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function enhanceBugReport(bugReport: BugReport): Promise<EnhancedBugReport> {
  // Sanitize user input to prevent prompt injection attacks
  // This protects against malicious attempts to manipulate the LLM's behavior
  const sanitizedReport = sanitizeBugReportForPrompt(bugReport);

  const prompt = `You are a technical bug report analyzer. Enhance the following bug report with:
1. A clear, detailed technical description
2. Suggested GitHub labels (max 5)
3. Technical context for developers
4. A specific prompt for Claude Code to fix this issue
5. Priority score (1-5, where 5 is critical)

Bug Report:
Title: ${sanitizedReport.title}
Description: ${sanitizedReport.description}
Steps to Reproduce: ${sanitizedReport.stepsToReproduce || 'Not provided'}
Expected Behavior: ${sanitizedReport.expectedBehavior || 'Not provided'}
Actual Behavior: ${sanitizedReport.actualBehavior || 'Not provided'}
Severity: ${sanitizedReport.severity}
Category: ${sanitizedReport.category}
Environment: ${sanitizedReport.environment || 'Not provided'}
Browser: ${sanitizedReport.browserInfo || 'Not provided'}

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
    console.error('Error enhancing bug report:', error);
    // Fallback to basic enhancement (using sanitized values for security)
    return {
      ...bugReport,
      enhancedDescription: sanitizedReport.description,
      suggestedLabels: [sanitizedReport.category, sanitizedReport.severity],
      technicalContext: `Category: ${sanitizedReport.category}, Severity: ${sanitizedReport.severity}`,
      claudePrompt: `Fix the following issue: ${sanitizedReport.title}. ${sanitizedReport.description}`,
      priority: sanitizedReport.severity === 'critical' ? 5 : sanitizedReport.severity === 'high' ? 4 : 3
    };
  }
}
