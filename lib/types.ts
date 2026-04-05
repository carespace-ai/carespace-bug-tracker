export interface BugReport {
  title: string;
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'ui' | 'functionality' | 'performance' | 'security' | 'other';
  userEmail?: string;
  environment?: string;
  browserInfo?: string;
  attachments?: {
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
}

export interface EnhancedBugReport extends BugReport {
  severity: 'low' | 'medium' | 'high' | 'critical'; // Required in enhanced report (AI determines if not provided)
  category: 'ui' | 'functionality' | 'performance' | 'security' | 'other'; // Required in enhanced report (AI determines if not provided)
  enhancedDescription: string;
  rootCauseHypothesis: string; // AI's hypothesis about the root cause
  codebaseContext: string; // Likely files, functions, and patterns involved
  enhancedExpectedBehavior: string; // AI-clarified expected behavior
  enhancedActualBehavior: string; // AI-clarified actual behavior
  gapAnalysis: string; // Why actual differs from expected
  suggestedLabels: string[];
  technicalContext: string;
  claudePrompt: string;
  priority: number;
  targetRepo: 'frontend' | 'backend';
}

export interface GitHubIssue {
  title: string;
  body: string;
  labels: string[];
  assignees?: string[];
}

export interface SubmitBugResponse {
  success: boolean;
  message: string;
  data?: {
    githubIssue: string;
    enhancedReport: {
      title: string;
      priority: number;
      labels: string[];
      targetRepo: 'frontend' | 'backend';
    };
  };
}

// AI Enhancement Settings Types
export type ClaudePromptStyle = 'technical' | 'verbose' | 'concise' | 'beginner-friendly';

export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
  description?: string;
}

export interface LabelTaxonomy {
  labels: string[];
  autoSuggestionRules: {
    keywords: string[];
    suggestedLabel: string;
  }[];
}

export interface PriorityWeights {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface AIEnhancementSettings {
  promptTemplate: PromptTemplate;
  labelTaxonomy: LabelTaxonomy;
  priorityWeights: PriorityWeights;
  claudePromptStyle: ClaudePromptStyle;
}

// Submission Queue Types
export interface QueuedSubmission {
  id: string;
  bugReport: BugReport;
  enhancedReport?: EnhancedBugReport;
  status: 'pending' | 'retrying' | 'failed' | 'partial';
  retryCount: number;
  timestamp: number;
  lastAttempt?: number;
  errors: {
    github?: string;
    anthropic?: string;
  };
  successfulServices: {
    github?: boolean;
    anthropic?: boolean;
  };
  urls?: {
    github?: string;
  };
}

// Webhook Types - Incoming Webhooks (from GitHub)
export interface GitHubWebhookEvent {
  action?: string; // e.g., 'opened', 'closed', 'reopened', 'labeled', 'unlabeled', 'created'
  issue?: {
    number: number;
    state: 'open' | 'closed';
    labels: Array<{
      name: string;
    }>;
  };
  comment?: {
    body: string;
    user: {
      login: string;
    };
  };
}


// Webhook Types - Outgoing Webhooks (to external services)
export type OutgoingWebhookEventType = 'bug.submitted' | 'bug.status_changed' | 'bug.resolved';

export interface OutgoingWebhookPayload {
  event: OutgoingWebhookEventType;
  timestamp: number;
  data: {
    bugReport: BugReport | EnhancedBugReport;
    githubIssueUrl?: string;
    previousStatus?: string;
    newStatus?: string;
  };
}

export interface WebhookSubscription {
  id: string;
  url: string;
  events: OutgoingWebhookEventType[];
  secret: string;
  createdAt: number;
  lastDeliveryAt?: number;
  failureCount?: number;
}
