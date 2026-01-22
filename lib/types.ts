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
    };
  };
}
