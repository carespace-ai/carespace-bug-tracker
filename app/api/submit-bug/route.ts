import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import axios from 'axios';
import { enhanceBugReport } from '@/lib/llm-service';
import { createGitHubIssue } from '@/lib/github-service';
import { createClickUpTask } from '@/lib/clickup-service';
import { BugReport, EnhancedBugReport } from '@/lib/types';

const bugReportSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  stepsToReproduce: z.string().optional(),
  expectedBehavior: z.string().optional(),
  actualBehavior: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.enum(['ui', 'functionality', 'performance', 'security', 'other']),
  userEmail: z.string().email().optional(),
  environment: z.string().optional(),
  browserInfo: z.string().optional(),
});

// Helper function to build ClickUp task description with GitHub URL
function buildClickUpDescription(
  enhancedReport: EnhancedBugReport,
  githubIssueUrl: string
): string {
  return `## Bug Report from Customer
**GitHub Issue**: ${githubIssueUrl}

### Description
${enhancedReport.enhancedDescription}

### Technical Context
${enhancedReport.technicalContext}

### Environment
- Severity: ${enhancedReport.severity}
- Category: ${enhancedReport.category}
- Environment: ${enhancedReport.environment || 'Not provided'}
- Browser: ${enhancedReport.browserInfo || 'Not provided'}

### Claude Code Prompt
\`\`\`
${enhancedReport.claudePrompt}
\`\`\``;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = bugReportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const bugReport: BugReport = validationResult.data;

    // Step 1: Enhance bug report with LLM
    console.log('Enhancing bug report with LLM...');
    const enhancedReport = await enhanceBugReport(bugReport);

    // Step 2 & 3: Create GitHub issue and ClickUp task in parallel
    console.log('Creating GitHub issue and ClickUp task in parallel...');
    const [githubIssueUrl, clickupTaskUrl] = await Promise.all([
      createGitHubIssue(enhancedReport),
      createClickUpTask(enhancedReport),
    ]);

    // Step 4: Update ClickUp task with GitHub URL (best effort)
    try {
      const taskIdMatch = clickupTaskUrl.match(/\/t\/([a-zA-Z0-9]+)/);
      if (taskIdMatch && taskIdMatch[1]) {
        const taskId = taskIdMatch[1];
        console.log('Updating ClickUp task with GitHub URL...');

        await axios.put(
          `https://api.clickup.com/api/v2/task/${taskId}`,
          {
            description: buildClickUpDescription(enhancedReport, githubIssueUrl),
          },
          {
            headers: {
              Authorization: process.env.CLICKUP_API_KEY || '',
              'Content-Type': 'application/json',
            },
          }
        );
      }
    } catch (error) {
      console.error('Failed to update ClickUp task with GitHub URL:', error);
      // Don't fail the entire request if this update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Bug report submitted successfully',
      data: {
        githubIssue: githubIssueUrl,
        clickupTask: clickupTaskUrl,
        enhancedReport: {
          title: enhancedReport.title,
          priority: enhancedReport.priority,
          labels: enhancedReport.suggestedLabels,
        },
      },
    });
  } catch (error) {
    console.error('Error processing bug report:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process bug report', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
