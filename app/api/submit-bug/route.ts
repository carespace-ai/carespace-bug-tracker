import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enhanceBugReport } from '@/lib/llm-service';
import { createGitHubIssue } from '@/lib/github-service';
import { createClickUpTask } from '@/lib/clickup-service';
import { BugReport, EnhancedBugReport } from '@/lib/types';
import { getRateLimitResult } from '@/lib/rate-limiter';
import { addToQueue } from '@/lib/submission-queue';

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

/**
 * Helper function to generate rate limit headers
 */
function getRateLimitHeaders(rateLimitResult: { remaining: number; resetTime: number }) {
  return {
    'X-RateLimit-Limit': '5',
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
  };
}

/**
 * Extracts client IP address from request headers
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return '127.0.0.1'; // Fallback for local development
}

export async function POST(request: NextRequest) {
  // Check rate limit first (outside try block so it's accessible in catch)
  const clientIP = getClientIP(request);
  const rateLimitResult = getRateLimitResult(clientIP);

  if (!rateLimitResult.allowed) {
    const resetDate = new Date(rateLimitResult.resetTime);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        resetTime: resetDate.toISOString()
      },
      {
        status: 429,
        headers: {
          ...getRateLimitHeaders(rateLimitResult),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      }
    );
  }

  try {
    const body = await request.json();

    // Validate input
    const validationResult = bugReportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        {
          status: 400,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      );
    }

    const bugReport: BugReport = validationResult.data;

    // Track results for each service
    let enhancedReport: EnhancedBugReport | undefined;
    let githubIssueUrl: string | undefined;
    let clickupTaskUrl: string | undefined;

    const errors: { github?: string; clickup?: string; anthropic?: string } = {};
    const successfulServices: { github?: boolean; clickup?: boolean; anthropic?: boolean } = {};

    // Step 1: Enhance bug report with LLM (graceful degradation - failure doesn't block)
    try {
      enhancedReport = await enhanceBugReport(bugReport);
      successfulServices.anthropic = true;
    } catch (error) {
      errors.anthropic = error instanceof Error ? error.message : 'Unknown error';
      // Use original bug report if enhancement fails
      enhancedReport = {
        ...bugReport,
        enhancedDescription: bugReport.description,
        suggestedLabels: [bugReport.category, bugReport.severity],
        technicalContext: '',
        claudePrompt: '',
        priority: bugReport.severity === 'critical' ? 1 : bugReport.severity === 'high' ? 2 : 3,
      };
    }

    // Step 2: Create GitHub issue
    try {
      githubIssueUrl = await createGitHubIssue(enhancedReport);
      successfulServices.github = true;
    } catch (error) {
      errors.github = error instanceof Error ? error.message : 'Unknown error';
    }

    // Step 3: Create ClickUp task
    try {
      clickupTaskUrl = await createClickUpTask(enhancedReport, githubIssueUrl);
      successfulServices.clickup = true;
    } catch (error) {
      errors.clickup = error instanceof Error ? error.message : 'Unknown error';
    }

    // Determine overall success status
    const hasAnySuccess = Object.values(successfulServices).some(Boolean);
    const hasAnyFailure = Object.keys(errors).length > 0;

    // If there are failures, add to queue for retry
    let queueId: string | undefined;
    if (hasAnyFailure) {
      try {
        queueId = addToQueue(
          bugReport,
          enhancedReport,
          errors,
          successfulServices,
          {
            github: githubIssueUrl,
            clickup: clickupTaskUrl
          }
        );
      } catch (queueError) {
        // Queue is full or error adding to queue - log but don't fail the request
      }
    }

    // Build response based on results
    if (!hasAnySuccess) {
      // Complete failure - all services failed
      return NextResponse.json(
        {
          success: false,
          message: 'Bug report submission failed',
          errors,
          queuedForRetry: queueId ? true : false,
          queueId
        },
        {
          status: 500,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      );
    }

    if (hasAnyFailure) {
      // Partial success - some services succeeded, some failed
      return NextResponse.json(
        {
          success: true,
          partial: true,
          message: 'Bug report partially submitted',
          data: {
            githubIssue: githubIssueUrl,
            clickupTask: clickupTaskUrl,
            enhancedReport: enhancedReport ? {
              title: enhancedReport.title,
              priority: enhancedReport.priority,
              labels: enhancedReport.suggestedLabels,
            } : undefined,
          },
          githubStatus: successfulServices.github ? 'success' : 'failed',
          clickupStatus: successfulServices.clickup ? 'success' : 'failed',
          errors,
          queuedForRetry: queueId ? true : false,
          queueId
        },
        {
          status: 207, // Multi-Status
          headers: getRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Complete success - all services succeeded
    return NextResponse.json(
      {
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
        githubStatus: 'success',
        clickupStatus: 'success',
      },
      {
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  } catch (error) {
    // Unexpected error (e.g., JSON parsing, validation)
    return NextResponse.json(
      {
        error: 'Failed to process bug report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  }
}
