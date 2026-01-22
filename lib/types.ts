export interface BugReport {
  title: string;
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'ui' | 'functionality' | 'performance' | 'security' | 'other';
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
  enhancedDescription: string;
  suggestedLabels: string[];
  technicalContext: string;
  claudePrompt: string;
  priority: number;
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
