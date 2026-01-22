import { NextRequest, NextResponse } from 'next/server';
import {
  getRetryableSubmissions,
  updateSubmission,
  incrementRetryCount
} from '@/lib/submission-queue';
import { createGitHubIssue } from '@/lib/github-service';
import { createClickUpTask } from '@/lib/clickup-service';

/**
 * Authenticates admin requests using API key
 */
function isAuthenticated(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-admin-api-key');
  const adminKey = process.env.ADMIN_API_KEY;

  // If no admin key is configured, allow access (for development)
  if (!adminKey) {
    return true;
  }

  return apiKey === adminKey;
}

/**
 * Retries a single queued submission
 * Returns result object with success status and updated service states
 */
async function retrySubmission(submission: {
  id: string;
  bugReport: any;
  enhancedReport?: any;
  errors: { github?: string; clickup?: string; anthropic?: string };
  successfulServices: { github?: boolean; clickup?: boolean; anthropic?: boolean };
  urls?: { github?: string; clickup?: string };
  retryCount: number;
}): Promise<{
  id: string;
  success: boolean;
  retried: string[];
  errors: { github?: string; clickup?: string; anthropic?: string };
  githubUrl?: string;
  clickupUrl?: string;
}> {
  const errors: { github?: string; clickup?: string; anthropic?: string } = {};
  const retriedServices: string[] = [];
  const successfulServices = { ...submission.successfulServices };

  let githubUrl: string | undefined = submission.urls?.github;
  let clickupUrl: string | undefined = submission.urls?.clickup;

  // Use enhanced report if available, otherwise use original bug report
  const reportToUse = submission.enhancedReport || {
    ...submission.bugReport,
    enhancedDescription: submission.bugReport.description,
    suggestedLabels: [submission.bugReport.category, submission.bugReport.severity],
    technicalContext: '',
    claudePrompt: '',
    priority: submission.bugReport.severity === 'critical' ? 1 : submission.bugReport.severity === 'high' ? 2 : 3,
  };

  // Retry GitHub if it previously failed
  if (!submission.successfulServices.github && submission.errors.github) {
    retriedServices.push('github');
    try {
      githubUrl = await createGitHubIssue(reportToUse);
      successfulServices.github = true;
      delete errors.github;
    } catch (error) {
      errors.github = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Retry ClickUp if it previously failed
  // Note: ClickUp requires a GitHub URL, so we can only retry if GitHub has succeeded
  if (!submission.successfulServices.clickup && submission.errors.clickup) {
    retriedServices.push('clickup');
    try {
      // Use the GitHub URL from retry if available, or from stored URLs
      const githubIssueUrl = githubUrl || submission.urls?.github || '';

      if (!githubIssueUrl) {
        throw new Error('Cannot create ClickUp task without GitHub issue URL');
      }

      clickupUrl = await createClickUpTask(reportToUse, githubIssueUrl);
      successfulServices.clickup = true;
      delete errors.clickup;
    } catch (error) {
      errors.clickup = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Update submission in queue
  const hasAnySuccess = Object.values(successfulServices).some(Boolean);
  const hasAnyFailure = Object.keys(errors).length > 0;

  let newStatus: 'pending' | 'retrying' | 'failed' | 'partial';
  if (!hasAnySuccess) {
    newStatus = 'failed';
  } else if (hasAnyFailure) {
    newStatus = 'partial';
  } else {
    newStatus = 'pending'; // Will be removed from queue as fully succeeded
  }

  updateSubmission(submission.id, {
    status: newStatus,
    lastAttempt: Date.now(),
    errors,
    successfulServices,
    urls: {
      github: githubUrl || submission.urls?.github,
      clickup: clickupUrl || submission.urls?.clickup
    }
  });

  incrementRetryCount(submission.id);

  return {
    id: submission.id,
    success: !hasAnyFailure,
    retried: retriedServices,
    errors: hasAnyFailure ? errors : {},
    githubUrl,
    clickupUrl
  };
}

/**
 * POST /api/retry-submissions
 * Retries all queued submissions that are ready for retry
 * Requires admin authentication via x-admin-api-key header
 */
export async function POST(request: NextRequest) {
  // Check authentication
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Admin API key required'
      },
      { status: 401 }
    );
  }

  try {
    // Get all submissions ready for retry
    const submissions = getRetryableSubmissions();

    if (submissions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No submissions to retry',
        results: []
      });
    }

    // Retry each submission
    const results = await Promise.allSettled(
      submissions.map(submission => retrySubmission(submission))
    );

    // Process results
    const retryResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: submissions[index].id,
          success: false,
          retried: [],
          errors: { system: result.reason?.message || 'Unknown error' }
        };
      }
    });

    // Count successes and failures
    const successCount = retryResults.filter(r => r.success).length;
    const failureCount = retryResults.length - successCount;

    return NextResponse.json({
      success: true,
      message: `Retried ${retryResults.length} submission(s)`,
      summary: {
        total: retryResults.length,
        succeeded: successCount,
        failed: failureCount
      },
      results: retryResults
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
