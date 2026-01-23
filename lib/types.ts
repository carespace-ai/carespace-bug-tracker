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

export interface ClickUpTask {
  name: string;
  description: string;
  status: string;
  priority: number;
  tags: string[];
}

export interface SubmitBugResponse {
  success: boolean;
  message: string;
  data?: {
    githubIssue: string;
    clickupTask: string;
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

// Sync Storage Types
export interface SyncMapping {
  githubIssueId: string;
  clickupTaskId: string;
  lastSyncedAt: number;
  syncDirection: 'github_to_clickup' | 'clickup_to_github' | 'bidirectional';
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
    clickup?: string;
    anthropic?: string;
  };
  successfulServices: {
    github?: boolean;
    clickup?: boolean;
    anthropic?: boolean;
  };
  urls?: {
    github?: string;
    clickup?: string;
  };
}
