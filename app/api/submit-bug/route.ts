import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enhanceBugReport } from '@/lib/llm-service';
import { createGitHubIssue, uploadFilesToGitHub } from '@/lib/github-service';
import { createClickUpTask } from '@/lib/clickup-service';
import { BugReport } from '@/lib/types';

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

export async function POST(request: NextRequest) {
  try {
    // Parse FormData from request
    const formData = await request.formData();

    // Extract form fields - FormData.get() returns string | null
    // Convert null to empty string for required fields to get proper validation errors
    const body = {
      title: (formData.get('title') as string | null) || '',
      description: (formData.get('description') as string | null) || '',
      stepsToReproduce: (formData.get('stepsToReproduce') as string) || undefined,
      expectedBehavior: (formData.get('expectedBehavior') as string) || undefined,
      actualBehavior: (formData.get('actualBehavior') as string) || undefined,
      severity: (formData.get('severity') as string | null) || '',
      category: (formData.get('category') as string | null) || '',
      userEmail: (formData.get('userEmail') as string) || undefined,
      environment: (formData.get('environment') as string) || undefined,
      browserInfo: (formData.get('browserInfo') as string) || undefined,
    };

    // Extract files from FormData
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File && value.size > 0) {
        files.push(value);
      }
    }

    // Upload files to GitHub if present
    let attachments: { name: string; size: number; type: string; url: string }[] = [];
    if (files.length > 0) {
      console.log('Uploading files to GitHub...');
      attachments = await uploadFilesToGitHub(files);
    }

    // Validate input
    const validationResult = bugReportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const bugReport: BugReport = {
      ...validationResult.data,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    // Step 1: Enhance bug report with LLM
    console.log('Enhancing bug report with LLM...');
    const enhancedReport = await enhanceBugReport(bugReport);

    // Step 2: Create GitHub issue
    console.log('Creating GitHub issue...');
    const githubIssueUrl = await createGitHubIssue(enhancedReport);

    // Step 3: Create ClickUp task
    console.log('Creating ClickUp task...');
    const clickupTaskUrl = await createClickUpTask(enhancedReport, githubIssueUrl, files);

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
