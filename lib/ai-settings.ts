import { AIEnhancementSettings, PromptTemplate, LabelTaxonomy, PriorityWeights, ClaudePromptStyle } from './types';

const STORAGE_KEY = 'ai-enhancement-settings';

/**
 * Default prompt template for bug report enhancement
 */
const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  name: 'Default Bug Report Enhancement',
  template: `You are a senior software engineer analyzing bug reports for a full-stack application (Next.js, React, TypeScript, Tailwind CSS). Your goal is to provide comprehensive technical analysis that enables another AI (Claude Code) to fix the issue efficiently.

## Bug Report Data
**Title:** {{title}}
**Description:** {{description}}
**Steps to Reproduce:** {{stepsToReproduce}}
**Expected Behavior:** {{expectedBehavior}}
**Actual Behavior:** {{actualBehavior}}
**Severity:** {{severity}}
**Category:** {{category}}
**Environment:** {{environment}}
**Browser:** {{browserInfo}}

## Your Analysis Tasks

1. **Enhanced Technical Description**
   - Rewrite the bug description with technical precision
   - Identify the specific symptoms and their technical manifestation
   - Clarify any vague language or assumptions
   - If expected/actual behavior is missing, infer it from the description

2. **Root Cause Hypothesis**
   - What is the likely technical root cause?
   - Which layer of the stack is involved? (UI/Component/State/API/Data/Auth/etc.)
   - What common patterns or anti-patterns might cause this?

3. **Codebase Context** (CRITICAL for AI to fix the issue)
   - Likely file locations: Which files probably need changes? (e.g., "app/page.tsx", "lib/github-service.ts")
   - Relevant components/functions: What specific functions or components are affected?
   - Dependencies: What services, APIs, or libraries are involved?
   - Architecture patterns: What patterns should be followed? (e.g., "Uses circuit breaker pattern in lib/circuit-breaker.ts")

4. **Behavioral Analysis**
   - **Expected Behavior:** Clear, specific description of correct behavior
   - **Actual Behavior:** Clear, specific description of observed behavior
   - **Gap Analysis:** Why is the actual behavior different from expected?

5. **Claude Code Action Plan**
   - Create a detailed, actionable prompt that tells Claude Code exactly what to do
   - Include: specific files to check, functions to modify, patterns to follow
   - Format: "1. Check X file for Y. 2. Modify Z function to do A. 3. Test by doing B."
   - Make it self-contained - assume Claude Code has no prior context

6. **Metadata**
   - **Severity:** low/medium/high/critical (if not provided, determine based on impact)
   - **Category:** ui/functionality/performance/security/other (if not provided, determine based on nature)
   - **Target Repo:** frontend or backend
     - Frontend: UI, React components, client-side, styling, browser issues, forms, routing
     - Backend: API routes, database, server logic, auth, data processing, external integrations
   - **Suggested Labels:** Max 5 relevant labels (bug, enhancement, critical, ui, performance, etc.)
   - **Priority:** 1-5 based on severity

## Tech Stack Context (Use for analysis)
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, serverless
- **Services:** GitHub API (Octokit), ClickUp API, Anthropic Claude API
- **Patterns:** Circuit breaker (lib/circuit-breaker.ts), Rate limiting (lib/rate-limiter.ts), Retry logic (lib/retry-handler.ts)
- **Key Files:**
  - Frontend: app/page.tsx (main form), app/layout.tsx
  - API: app/api/submit-bug/route.ts
  - Services: lib/github-service.ts, lib/clickup-service.ts, lib/llm-service.ts
  - Chrome Extension: chrome-extension/popup.js, chrome-extension/content.js

## Output Format (JSON)
Respond ONLY with valid JSON:
{
  "enhancedDescription": "Technical rewrite with clarity and precision. 2-4 sentences.",
  "rootCauseHypothesis": "Likely technical root cause. 1-2 sentences.",
  "codebaseContext": "Likely file locations (e.g. 'app/api/submit-bug/route.ts'), affected functions, relevant patterns. 2-3 sentences.",
  "expectedBehavior": "Clear, specific expected behavior. 1-2 sentences.",
  "actualBehavior": "Clear, specific actual behavior. 1-2 sentences.",
  "gapAnalysis": "Why actual differs from expected. 1-2 sentences.",
  "technicalContext": "Additional context: dependencies, architecture, edge cases. 2-3 sentences.",
  "claudePrompt": "Detailed action plan for Claude Code. Step-by-step instructions with specific files and functions. 3-6 steps.",
  "suggestedLabels": ["label1", "label2", "label3"],
  "priority": 3,
  "severity": "medium",
  "category": "functionality",
  "targetRepo": "frontend"
}`,
  variables: ['title', 'description', 'stepsToReproduce', 'expectedBehavior', 'actualBehavior', 'severity', 'category', 'environment', 'browserInfo'],
  description: 'Comprehensive template for actionable bug analysis with codebase context'
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
