import { NextRequest, NextResponse } from 'next/server';
import {
  getRetryableSubmissions,
  updateSubmission,
  incrementRetryCount
} from '@/lib/submission-queue';
import { createGitHubIssue } from '@/lib/github-service';
import { logger, generateCorrelationId } from '@/lib/logger';

/**
 * Authenticates admin requests using API key
 */
function isAuthenticated(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-admin-api-key');
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    return true;
  }

  return apiKey === adminKey;
}

/**
 * Retries a single queued submission
 */
async function retrySubmission(submission: {
  id: string;
  bugReport: any;
  enhancedReport?: any;
  errors: { github?: string; anthropic?: string };
  successfulServices: { github?: boolean; anthropic?: boolean };
  urls?: { github?: string };
  retryCount: number;
}): Promise<{
  id: string;
  success: boolean;
  retried: string[];
  errors: { github?: string; anthropic?: string };
  githubUrl?: string;
}> {
  const correlationId = generateCorrelationId();
  const errors: { github?: string; anthropic?: string } = {};
  const retriedServices: string[] = [];
  const successfulServices = { ...submission.successfulServices };

  let githubUrl: string | undefined = submission.urls?.github;

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
    logger.info('Retrying GitHub issue creation', { correlationId, service: 'retry', operation: 'github' }, {
      submissionId: submission.id,
      retryCount: submission.retryCount,
    });
    try {
      const githubResult = await createGitHubIssue(reportToUse, correlationId);
      githubUrl = githubResult.url;
      successfulServices.github = true;
      delete errors.github;
      logger.info('GitHub issue retry succeeded', { correlationId, service: 'retry' }, {
        url: githubResult.url,
      });
    } catch (error) {
      errors.github = error instanceof Error ? error.message : 'Unknown error';
      logger.error('GitHub issue retry failed', { correlationId, service: 'retry' }, {
        error: errors.github,
      });
    }
  }

  const hasAnySuccess = Object.values(successfulServices).some(Boolean);
  const hasAnyFailure = Object.keys(errors).length > 0;

  let newStatus: 'pending' | 'retrying' | 'failed' | 'partial';
  if (!hasAnySuccess) {
    newStatus = 'failed';
  } else if (hasAnyFailure) {
    newStatus = 'partial';
  } else {
    newStatus = 'pending';
  }

  updateSubmission(submission.id, {
    status: newStatus,
    lastAttempt: Date.now(),
    errors,
    successfulServices,
    urls: {
      github: githubUrl || submission.urls?.github,
    }
  });

  incrementRetryCount(submission.id);

  return {
    id: submission.id,
    success: !hasAnyFailure,
    retried: retriedServices,
    errors: hasAnyFailure ? errors : {},
    githubUrl,
  };
}

/**
 * POST /api/retry-submissions
 * Retries all queued submissions that are ready for retry
 * Requires admin authentication via x-admin-api-key header
 */
export async function POST(request: NextRequest) {
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
    const submissions = getRetryableSubmissions();

    if (submissions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No submissions to retry',
        results: []
      });
    }

    const results = await Promise.allSettled(
      submissions.map(submission => retrySubmission(submission))
    );

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
