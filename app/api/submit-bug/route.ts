import { NextRequest, NextResponse } from 'next/server';
import { enhanceBugReport } from '@/lib/llm-service';
import { createGitHubIssue } from '@/lib/github-service';
import { uploadFilesToAzureBlob } from '@/lib/azure-blob-service';
import { BugReport, OutgoingWebhookPayload } from '@/lib/types';
import { getRateLimitResult } from '@/lib/rate-limiter';
import { bugReportSchema } from '@/lib/validation/bug-report-schema';
import { deliverWebhookToSubscribers } from '@/lib/outgoing-webhook-service';
import { logger, generateCorrelationId, withTiming, LogContext } from '@/lib/logger';

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
 *
 * @important GDPR/Privacy Compliance
 * IP addresses are PII under GDPR. They MUST NOT be logged or exposed in error messages.
 * Use only for rate limiting (in-memory) and security monitoring.
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
  return '127.0.0.1';
}

export async function POST(request: NextRequest) {
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

  const correlationId = generateCorrelationId();
  const ctx: LogContext = { correlationId, service: 'submit-bug' };

  try {
    const formData = await request.formData();

    const getFormValue = (key: string): string | undefined => {
      const value = formData.get(key);
      if (!value || value === '') return undefined;
      return value as string;
    };

    const body = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      stepsToReproduce: getFormValue('stepsToReproduce'),
      expectedBehavior: getFormValue('expectedBehavior'),
      actualBehavior: getFormValue('actualBehavior'),
      severity: getFormValue('severity'),
      category: getFormValue('category'),
      userEmail: getFormValue('userEmail'),
      environment: getFormValue('environment'),
      browserInfo: getFormValue('browserInfo'),
    };

    const attachments = formData.getAll('attachments') as File[];

    // Validate file attachments
    const maxFileCount = 5;
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'video/mp4', 'video/quicktime',
      'text/plain', 'application/pdf', 'application/json'
    ];
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
      '.mp4', '.mov', '.txt', '.log', '.pdf', '.json'
    ];

    if (attachments.length > maxFileCount) {
      return NextResponse.json(
        { error: `Too many files. Maximum ${maxFileCount} files allowed.` },
        { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    for (const file of attachments) {
      if (!file || file.size === 0) continue;

      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 10MB` },
          { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
        );
      }

      const fileName = file.name || 'unknown';
      const lastDotIndex = fileName.lastIndexOf('.');
      const fileExtension = lastDotIndex !== -1 ? fileName.toLowerCase().substring(lastDotIndex) : '';
      const isValidType = allowedTypes.includes(file.type);
      const isValidExtension = fileExtension && allowedExtensions.includes(fileExtension);
      const isOctetStreamWithValidExtension = file.type === 'application/octet-stream' && isValidExtension;

      if (!isValidType && !isValidExtension && !isOctetStreamWithValidExtension) {
        return NextResponse.json(
          {
            error: `File "${fileName}" rejected. Type: ${file.type}, Extension: ${fileExtension}. Allowed types: images (jpg, png, gif, webp), videos (mp4, mov), documents (pdf, txt, json)`
          },
          { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
        );
      }
    }

    // Validate input
    const validationResult = bugReportSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');

      return NextResponse.json(
        {
          error: 'Invalid input',
          details: errorMessages,
          validationErrors: validationResult.error.issues
        },
        { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const bugReport: BugReport = validationResult.data;

    logger.info('Processing bug report submission', ctx, {
      title: bugReport.title,
      severity: bugReport.severity,
      category: bugReport.category,
      hasAttachments: attachments.length > 0,
    });

    // Step 1: Enhance bug report with LLM
    const enhancedReport = await withTiming('LLM enhancement', { ...ctx, operation: 'enhance' }, () =>
      enhanceBugReport(bugReport)
    );

    logger.info('LLM enhancement complete', ctx, {
      targetRepo: enhancedReport.targetRepo,
      priority: enhancedReport.priority,
      labels: enhancedReport.suggestedLabels,
    });

    // Step 2: Upload attachments to Azure Blob Storage (if any)
    const validAttachments = attachments.filter(file => file && file.size > 0);

    if (validAttachments.length > 0) {
      const uploadedAttachments = await withTiming(
        'Azure Blob upload',
        { ...ctx, operation: 'upload-attachments' },
        () => uploadFilesToAzureBlob(validAttachments)
      );
      enhancedReport.attachments = uploadedAttachments;
      logger.info('Attachments uploaded', ctx, { count: uploadedAttachments.length });
    }

    // Step 3: Create GitHub issue
    const githubResult = await withTiming(
      'GitHub issue creation',
      { ...ctx, operation: 'create-github-issue' },
      () => createGitHubIssue(enhancedReport, correlationId)
    );

    logger.info('GitHub issue created successfully', ctx, {
      url: githubResult.url,
      issueNumber: githubResult.issueNumber,
      targetRepo: enhancedReport.targetRepo,
    });

    // Step 4: Deliver outgoing webhooks (fire-and-forget)
    const webhookPayload: OutgoingWebhookPayload = {
      event: 'bug.submitted',
      timestamp: Date.now(),
      data: {
        bugReport: enhancedReport,
        githubIssueUrl: githubResult.url,
      }
    };

    deliverWebhookToSubscribers('bug.submitted', webhookPayload).catch(error => {
      logger.error('Failed to deliver webhooks', ctx, {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    logger.info('Bug report submission complete', ctx);

    return NextResponse.json(
      {
        success: true,
        message: 'Bug report submitted successfully',
        correlationId,
        data: {
          githubIssue: githubResult.url,
          enhancedReport: {
            title: enhancedReport.title,
            priority: enhancedReport.priority,
            labels: enhancedReport.suggestedLabels,
            targetRepo: enhancedReport.targetRepo,
          },
        },
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error processing bug report', ctx, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to process bug report',
        details: errorMessage,
        correlationId,
      },
      { status: 500, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }
}
