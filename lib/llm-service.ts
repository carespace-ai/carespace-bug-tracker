import Anthropic from '@anthropic-ai/sdk';
import { BugReport, EnhancedBugReport, ClaudePromptStyle } from './types';
import { loadSettings } from './ai-settings';
import { sanitizeBugReportForPrompt } from './prompt-sanitizer';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  timeout: 60000, // 60 seconds timeout for API requests
  maxRetries: 3, // Retry up to 3 times with exponential backoff
});

/**
 * Apply Claude Code prompt style to a generated prompt
 */
function applyPromptStyle(basePrompt: string, style: ClaudePromptStyle, bugReport: BugReport): string {
  const sanitized = sanitizeBugReportForPrompt(bugReport);

  switch (style) {
    case 'verbose':
      // Add detailed context and instructions
      return `${basePrompt}

Context:
- Bug Title: ${sanitized.title}
- Severity: ${sanitized.severity}
- Category: ${sanitized.category}
- Description: ${sanitized.description}
${sanitized.stepsToReproduce ? `- Steps to Reproduce: ${sanitized.stepsToReproduce}` : ''}
${sanitized.expectedBehavior ? `- Expected Behavior: ${sanitized.expectedBehavior}` : ''}
${sanitized.actualBehavior ? `- Actual Behavior: ${sanitized.actualBehavior}` : ''}
${sanitized.environment ? `- Environment: ${sanitized.environment}` : ''}

Please provide a comprehensive solution with:
1. Root cause analysis
2. Detailed implementation steps
3. Testing recommendations
4. Potential edge cases to consider`;

    case 'concise':
      // Keep it short and direct
      return `${basePrompt}. Bug: ${sanitized.title}`;

    case 'technical':
      // Focus on technical details and implementation
      return `${basePrompt}

Technical Details:
- Issue: ${sanitized.title}
- Severity: ${sanitized.severity}
- Category: ${sanitized.category}

Focus on implementation details, code changes, and technical root cause.`;

    case 'beginner-friendly':
      // Add explanations and use simple language
      return `${basePrompt}

Problem Summary: ${sanitized.title}

This is a ${sanitized.severity} severity ${sanitized.category} issue. ${sanitized.description}

Please provide:
1. A clear explanation of what's wrong
2. Step-by-step instructions to fix it
3. Code examples where helpful
4. Explanation of why this approach works`;

    default:
      // Fallback to technical style
      return applyPromptStyle(basePrompt, 'technical', bugReport);
  }
}

/**
 * Replace template variables with actual values from bug report
 */
function fillTemplate(template: string, bugReport: BugReport): string {
  const variables: Record<string, string> = {
    title: bugReport.title,
    description: bugReport.description,
    stepsToReproduce: bugReport.stepsToReproduce || 'Not provided',
    expectedBehavior: bugReport.expectedBehavior || 'Not provided',
    actualBehavior: bugReport.actualBehavior || 'Not provided',
    severity: bugReport.severity,
    category: bugReport.category,
    environment: bugReport.environment || 'Not provided',
    browserInfo: bugReport.browserInfo || 'Not provided'
  };

  let filledTemplate = template;
  for (const [key, value] of Object.entries(variables)) {
    filledTemplate = filledTemplate.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  return filledTemplate;
}

/**
 * Calculate priority score based on severity and configured weights
 */
function calculatePriority(severity: BugReport['severity'], settings: ReturnType<typeof loadSettings>): number {
  const weights = settings.priorityWeights;

  // Map severity to priority weight
  switch (severity) {
    case 'critical':
      return weights.critical;
    case 'high':
      return weights.high;
    case 'medium':
      return weights.medium;
    case 'low':
      return weights.low;
    default:
      // Fallback to medium priority if severity is somehow invalid
      return weights.medium;
  }
}

/**
 * Filter suggested labels to only include labels from configured taxonomy
 * Also applies auto-suggestion rules based on bug report content
 */
function filterLabels(suggestedLabels: string[], bugReport: BugReport, settings: ReturnType<typeof loadSettings>): string[] {
  const allowedLabels = settings.labelTaxonomy.labels;

  // Filter suggested labels to only include those in the taxonomy
  const filteredLabels = suggestedLabels.filter(label =>
    allowedLabels.includes(label)
  );

  // Apply auto-suggestion rules if configured
  if (settings.labelTaxonomy.autoSuggestionRules) {
    const contentToCheck = `${bugReport.title} ${bugReport.description}`.toLowerCase();

    for (const rule of settings.labelTaxonomy.autoSuggestionRules) {
      const hasKeyword = rule.keywords.some(keyword =>
        contentToCheck.includes(keyword.toLowerCase())
      );

      if (hasKeyword && allowedLabels.includes(rule.suggestedLabel)) {
        // Add the label if it's not already in the filtered list
        if (!filteredLabels.includes(rule.suggestedLabel)) {
          filteredLabels.push(rule.suggestedLabel);
        }
      }
    }
  }

  return filteredLabels;
}

export async function enhanceBugReport(bugReport: BugReport): Promise<EnhancedBugReport> {
  // Sanitize the bug report to prevent prompt injection attacks
  const sanitizedBugReport = sanitizeBugReportForPrompt(bugReport);

  // Load configurable settings and use the prompt template
  const settings = loadSettings();
  const prompt = fillTemplate(settings.promptTemplate.template, sanitizedBugReport);

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

    // Filter labels to match configured taxonomy
    const filteredLabels = filterLabels(enhanced.suggestedLabels || [], bugReport, settings);

    // Apply configured prompt style to the Claude prompt
    const styledPrompt = applyPromptStyle(
      enhanced.claudePrompt || `Fix the following issue: ${sanitizedBugReport.title}`,
      settings.claudePromptStyle,
      bugReport
    );

    return {
      ...bugReport,
      enhancedDescription: enhanced.enhancedDescription,
      suggestedLabels: filteredLabels,
      technicalContext: enhanced.technicalContext,
      claudePrompt: styledPrompt,
      priority: calculatePriority(bugReport.severity, settings)
    };
  } catch (error) {
    // Check if this is a timeout error
    const isTimeout = error instanceof Error && (
      error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('timed out')
    );

    if (isTimeout) {
      console.error('Request timeout while enhancing bug report. The AI service took too long to respond. Falling back to basic enhancement.');
    } else {
      console.error('Error enhancing bug report:', error);
    }

    // Fallback to basic enhancement using sanitized values
    const fallbackLabels = [sanitizedBugReport.category, sanitizedBugReport.severity];
    const filteredFallbackLabels = filterLabels(fallbackLabels, bugReport, settings);

    // Apply configured prompt style to the fallback Claude prompt
    const fallbackBasePrompt = `Fix the following issue: ${sanitizedBugReport.title}`;
    const styledFallbackPrompt = applyPromptStyle(
      fallbackBasePrompt,
      settings.claudePromptStyle,
      bugReport
    );

    return {
      ...bugReport,
      enhancedDescription: sanitizedBugReport.description,
      suggestedLabels: filteredFallbackLabels,
      technicalContext: `Category: ${sanitizedBugReport.category}, Severity: ${sanitizedBugReport.severity}`,
      claudePrompt: styledFallbackPrompt,
      priority: calculatePriority(sanitizedBugReport.severity, settings)
    };
  }
}
