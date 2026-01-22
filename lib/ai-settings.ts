import { AIEnhancementSettings, PromptTemplate, LabelTaxonomy, PriorityWeights, ClaudePromptStyle } from './types';

const STORAGE_KEY = 'ai-enhancement-settings';

/**
 * Default prompt template for bug report enhancement
 */
const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  name: 'Default Bug Report Enhancement',
  template: `You are a technical bug report analyzer. Enhance the following bug report with:
1. A clear, detailed technical description
2. Suggested GitHub labels (max 5)
3. Technical context for developers
4. A specific prompt for Claude Code to fix this issue
5. Priority score (1-5, where 5 is critical)

Bug Report:
Title: {{title}}
Description: {{description}}
Steps to Reproduce: {{stepsToReproduce}}
Expected Behavior: {{expectedBehavior}}
Actual Behavior: {{actualBehavior}}
Severity: {{severity}}
Category: {{category}}
Environment: {{environment}}
Browser: {{browserInfo}}

Respond in JSON format:
{
  "enhancedDescription": "detailed technical description",
  "suggestedLabels": ["label1", "label2"],
  "technicalContext": "context for developers",
  "claudePrompt": "specific prompt for Claude Code",
  "priority": 3
}`,
  variables: ['title', 'description', 'stepsToReproduce', 'expectedBehavior', 'actualBehavior', 'severity', 'category', 'environment', 'browserInfo'],
  description: 'Standard template for enhancing bug reports with AI analysis'
};

/**
 * Default label taxonomy and auto-suggestion rules
 */
const DEFAULT_LABEL_TAXONOMY: LabelTaxonomy = {
  labels: [
    'bug',
    'enhancement',
    'critical',
    'high',
    'medium',
    'low',
    'high-priority',
    'medium-priority',
    'low-priority',
    'ui',
    'functionality',
    'performance',
    'security',
    'needs-investigation',
    'ready-to-fix',
    'mobile',
    'login',
    'label1',
    'label2',
    'label3'
  ],
  autoSuggestionRules: [
    {
      keywords: ['crash', 'error', 'broken', 'failed'],
      suggestedLabel: 'bug'
    },
    {
      keywords: ['slow', 'lag', 'performance', 'timeout'],
      suggestedLabel: 'performance'
    },
    {
      keywords: ['ui', 'interface', 'display', 'visual', 'layout'],
      suggestedLabel: 'ui'
    },
    {
      keywords: ['security', 'vulnerable', 'exploit', 'xss', 'injection'],
      suggestedLabel: 'security'
    },
    {
      keywords: ['critical', 'urgent', 'severe'],
      suggestedLabel: 'critical'
    }
  ]
};

/**
 * Default priority weights based on severity
 */
const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2
};

/**
 * Default Claude Code prompt style
 */
const DEFAULT_CLAUDE_PROMPT_STYLE: ClaudePromptStyle = 'technical';

/**
 * Get default AI enhancement settings
 */
export function getDefaultSettings(): AIEnhancementSettings {
  return {
    promptTemplate: DEFAULT_PROMPT_TEMPLATE,
    labelTaxonomy: DEFAULT_LABEL_TAXONOMY,
    priorityWeights: DEFAULT_PRIORITY_WEIGHTS,
    claudePromptStyle: DEFAULT_CLAUDE_PROMPT_STYLE
  };
}

/**
 * Load AI enhancement settings from storage
 * Falls back to default settings if not found or on error
 */
export function loadSettings(): AIEnhancementSettings {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return getDefaultSettings();
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getDefaultSettings();
    }

    const parsed = JSON.parse(stored);

    // Validate that the loaded settings have the required structure
    if (!parsed.promptTemplate || !parsed.labelTaxonomy || !parsed.priorityWeights || !parsed.claudePromptStyle) {
      return getDefaultSettings();
    }

    return parsed as AIEnhancementSettings;
  } catch (error) {
    return getDefaultSettings();
  }
}

/**
 * Save AI enhancement settings to storage
 */
export function saveSettings(settings: AIEnhancementSettings): boolean {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    return false;
  }
}
