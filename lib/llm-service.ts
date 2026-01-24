import Anthropic from '@anthropic-ai/sdk';
import { BugReport, EnhancedBugReport, ClaudePromptStyle } from './types';
import { loadSettings } from './ai-settings';
import { sanitizeBugReportForPrompt } from './prompt-sanitizer';
import { formatCodebaseContextForPrompt } from './codebase-context-loader';

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
    severity: bugReport.severity || 'Not provided (please determine)',
    category: bugReport.category || 'Not provided (please determine)',
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
 * Determine target repository based on bug category as fallback
 */
function determineRepoFromCategory(category: BugReport['category']): 'frontend' | 'backend' {
  switch (category) {
    case 'ui':
      return 'frontend';
    case 'performance':
      // Performance could be either, default to backend
      return 'backend';
    case 'security':
      // Security could be either, default to backend
      return 'backend';
    case 'functionality':
      // Functionality could be either, default to frontend (most user-facing issues)
      return 'frontend';
    case 'other':
    default:
      // Default to frontend for unknown categories
      return 'frontend';
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

export async function enhanceBugReport(bugReport: BugReport, correlationId?: string): Promise<EnhancedBugReport> {
  const logPrefix = correlationId ? `[LLM] [reqId: ${correlationId}]` : '[LLM]';

  // Sanitize the bug report to prevent prompt injection attacks
  const sanitizedBugReport = sanitizeBugReportForPrompt(bugReport);

  // Load configurable settings and use the prompt template
  const settings = loadSettings();
  let prompt = fillTemplate(settings.promptTemplate.template, sanitizedBugReport);

  // Add codebase context to the prompt
  // Determine which context to load based on bug category/description
  const description = (sanitizedBugReport.description + ' ' + sanitizedBugReport.title).toLowerCase();
  const isBackendRelated = /api|database|server|auth|backend|endpoint|query|sql/i.test(description);

  // Load only relevant context to keep prompt concise
  let codebaseContext = '';
  if (isBackendRelated) {
    const backendContext = formatCodebaseContextForPrompt('backend');
    codebaseContext = `\n\n## Backend Codebase Context\n${backendContext}\n**Use this context for file paths and patterns in your analysis.**\n`;
  } else {
    const frontendContext = formatCodebaseContextForPrompt('frontend');
    codebaseContext = `\n\n## Frontend Codebase Context\n${frontendContext}\n**Use this context for file paths and patterns in your analysis.**\n`;
  }

  prompt += codebaseContext;

  // Log prompt statistics for debugging
  console.log(`${logPrefix} Prompt length:`, prompt.length, 'characters');
  console.log(`${logPrefix} Estimated tokens:`, Math.ceil(prompt.length / 4));
  console.log(`${logPrefix} Attempting API call to Claude...`);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101', // Claude Opus 4.5 - Most capable model for complex analysis
      max_tokens: 4000, // Increased for more detailed analysis with Opus
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    console.log(`${logPrefix} API call successful`);

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

    // Use AI-determined severity and category if not provided by user
    const finalSeverity = bugReport.severity || enhanced.severity || 'medium';
    const finalCategory = bugReport.category || enhanced.category || 'functionality';

    // Validate AI-provided values
    const validSeverities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
    const validCategories: Array<'ui' | 'functionality' | 'performance' | 'security' | 'other'> = ['ui', 'functionality', 'performance', 'security', 'other'];

    const severity: 'low' | 'medium' | 'high' | 'critical' = (validSeverities.includes(finalSeverity as any)) ? finalSeverity as any : 'medium';
    const category: 'ui' | 'functionality' | 'performance' | 'security' | 'other' = (validCategories.includes(finalCategory as any)) ? finalCategory as any : 'functionality';

    // Apply configured prompt style to the Claude prompt (with severity/category set)
    const bugReportWithMetadata = { ...bugReport, severity, category };
    const styledPrompt = applyPromptStyle(
      enhanced.claudePrompt || `Fix the following issue: ${sanitizedBugReport.title}`,
      settings.claudePromptStyle,
      bugReportWithMetadata
    );

    // Determine target repository with fallback logic
    let targetRepo: 'frontend' | 'backend' = enhanced.targetRepo || 'frontend';
    if (targetRepo !== 'frontend' && targetRepo !== 'backend') {
      // If AI returns invalid value, use category-based fallback
      targetRepo = determineRepoFromCategory(category as BugReport['category']);
    }

    return {
      ...bugReport,
      severity,
      category,
      enhancedDescription: enhanced.enhancedDescription || sanitizedBugReport.description,
      rootCauseHypothesis: enhanced.rootCauseHypothesis || 'Not analyzed',
      codebaseContext: enhanced.codebaseContext || 'No specific context provided',
      enhancedExpectedBehavior: enhanced.expectedBehavior || bugReport.expectedBehavior || 'Not specified',
      enhancedActualBehavior: enhanced.actualBehavior || bugReport.actualBehavior || 'Not specified',
      gapAnalysis: enhanced.gapAnalysis || 'Analysis not available',
      suggestedLabels: filteredLabels,
      technicalContext: enhanced.technicalContext || `Category: ${category}, Severity: ${severity}`,
      claudePrompt: styledPrompt,
      priority: calculatePriority(severity, settings),
      targetRepo
    };
  } catch (error) {
    // Check if this is a timeout error
    const isTimeout = error instanceof Error && (
      error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('timed out')
    );

    if (isTimeout) {
      console.error(`${logPrefix} Request timeout while enhancing bug report. The AI service took too long to respond. Falling back to basic enhancement.`);
    } else {
      console.error(`${logPrefix} Error enhancing bug report:`, error);
      // Log additional details for debugging
      if (error instanceof Error) {
        console.error(`${logPrefix} Error name:`, error.name);
        console.error(`${logPrefix} Error message:`, error.message);
        console.error(`${logPrefix} Error stack:`, error.stack);
      }
    }

    // Fallback to basic enhancement using sanitized values
    // Provide defaults if user didn't specify
    const fallbackSeverity: 'low' | 'medium' | 'high' | 'critical' = bugReport.severity || 'medium';
    const fallbackCategory: 'ui' | 'functionality' | 'performance' | 'security' | 'other' = bugReport.category || 'functionality';

    const fallbackLabels = [fallbackCategory, fallbackSeverity];
    const filteredFallbackLabels = filterLabels(fallbackLabels, bugReport, settings);

    // Apply configured prompt style to the fallback Claude prompt
    // Create a bug report with fallback values for the prompt
    const fallbackBugReport = {
      ...bugReport,
      severity: fallbackSeverity,
      category: fallbackCategory
    };
    const fallbackBasePrompt = `Fix the following issue: ${sanitizedBugReport.title}`;
    const styledFallbackPrompt = applyPromptStyle(
      fallbackBasePrompt,
      settings.claudePromptStyle,
      fallbackBugReport
    );

    return {
      ...bugReport,
      severity: fallbackSeverity,
      category: fallbackCategory,
      enhancedDescription: sanitizedBugReport.description,
      rootCauseHypothesis: 'AI analysis unavailable - manual investigation required',
      codebaseContext: `Category: ${fallbackCategory}. Manual code review needed.`,
      enhancedExpectedBehavior: bugReport.expectedBehavior || 'Not specified',
      enhancedActualBehavior: bugReport.actualBehavior || 'Not specified',
      gapAnalysis: 'AI analysis unavailable',
      suggestedLabels: filteredFallbackLabels,
      technicalContext: `Category: ${fallbackCategory}, Severity: ${fallbackSeverity}`,
      claudePrompt: styledFallbackPrompt,
      priority: calculatePriority(fallbackSeverity, settings),
      targetRepo: determineRepoFromCategory(fallbackCategory)
    };
  }
}
