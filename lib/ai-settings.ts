import { AIEnhancementSettings, PromptTemplate, LabelTaxonomy, PriorityWeights, ClaudePromptStyle } from './types';

const STORAGE_KEY = 'ai-enhancement-settings';

/**
 * Default prompt template for bug report enhancement
 */
const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  name: 'Default Bug Report Enhancement',
  template: `Analyze this bug report and provide actionable technical analysis for Claude Code to fix it.

## Bug Report
Title: {{title}}
Description: {{description}}
Steps: {{stepsToReproduce}}
Expected: {{expectedBehavior}}
Actual: {{actualBehavior}}
Severity: {{severity}}
Category: {{category}}
Environment: {{environment}}
Browser: {{browserInfo}}

## Required Analysis

1. **Enhanced Description** - Rewrite technically (2-3 sentences)
2. **Root Cause** - Likely technical cause (1-2 sentences)
3. **Codebase Context** - Specific files/functions to check with path aliases (2-3 sentences)
4. **Expected Behavior** - Clear expected behavior (1 sentence)
5. **Actual Behavior** - Clear actual behavior (1 sentence)
6. **Gap Analysis** - Why they differ (1 sentence)
7. **Technical Context** - Dependencies, patterns, edge cases (2 sentences)
8. **Claude Prompt** - Step-by-step fix instructions with specific files (4-6 steps)
9. **Metadata** - Determine if not provided:
   - Severity: low/medium/high/critical
   - Category: ui/functionality/performance/security/other
   - Target Repo: frontend (UI/components/forms/routing/styling) or backend (API/database/auth/server logic)
   - Labels: Max 5 relevant labels
   - Priority: 1-5 based on severity

## Output (JSON only)
{
  "enhancedDescription": "...",
  "rootCauseHypothesis": "...",
  "codebaseContext": "...",
  "expectedBehavior": "...",
  "actualBehavior": "...",
  "gapAnalysis": "...",
  "technicalContext": "...",
  "claudePrompt": "1. Check... 2. Modify... 3. Test...",
  "suggestedLabels": ["bug", "ui"],
  "priority": 3,
  "severity": "medium",
  "category": "functionality",
  "targetRepo": "frontend"
}`,
  variables: ['title', 'description', 'stepsToReproduce', 'expectedBehavior', 'actualBehavior', 'severity', 'category', 'environment', 'browserInfo'],
  description: 'Concise template optimized for token efficiency'
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
