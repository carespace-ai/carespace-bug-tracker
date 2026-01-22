import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enhanceBugReport } from '@/lib/llm-service';
import { createGitHubIssue, uploadFilesToGitHub } from '@/lib/github-service';
import { createClickUpTask } from '@/lib/clickup-service';
import { BugReport } from '@/lib/types';
import { getRateLimitResult, RATE_LIMIT_MAX_REQUESTS } from '@/lib/rate-limiter';

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
    'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
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
    const retryAfterSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);

    console.error(
      `Rate limit violation: Request blocked from IP ${clientIP}. ` +
      `Retry available in ${retryAfterSeconds} seconds at ${resetDate.toISOString()}.`
    );

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
    // Parse FormData instead of JSON
    const formData = await request.formData();

    // Extract form fields from FormData
    const body = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      stepsToReproduce: formData.get('stepsToReproduce') as string | undefined,
      expectedBehavior: formData.get('expectedBehavior') as string | undefined,
      actualBehavior: formData.get('actualBehavior') as string | undefined,
      severity: formData.get('severity') as string,
      category: formData.get('category') as string,
      userEmail: formData.get('userEmail') as string | undefined,
      environment: formData.get('environment') as string | undefined,
      browserInfo: formData.get('browserInfo') as string | undefined,
    };

    // Extract file attachments
    const attachments = formData.getAll('attachments') as File[];

    // Validate file attachments
    const maxFileCount = 5;
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'text/plain',        // For .txt and .log files
      'application/pdf',   // For PDF documents
      'application/json',  // For JSON log files
    ];

    // Check file count
    if (attachments.length > maxFileCount) {
      return NextResponse.json(
        {
          error: 'Too many files',
          message: `Maximum ${maxFileCount} files allowed. You uploaded ${attachments.length} files.`
        },
        {
          status: 400,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Validate each file
    const fileErrors: string[] = [];
    for (const file of attachments) {
      // Check file size
      if (file.size > maxFileSize) {
        fileErrors.push(`${file.name} is too large (max 10MB)`);
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        fileErrors.push(`${file.name} has unsupported file type (${file.type})`);
      }
    }

    if (fileErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid file attachments',
          message: fileErrors.join(', ')
        },
        {
          status: 400,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      );
    }

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

    // Step 1: Enhance bug report with LLM
    console.log('Enhancing bug report with LLM...');
    const enhancedReport = await enhanceBugReport(bugReport);

    // Step 2: Upload file attachments to GitHub (if any)
    if (attachments.length > 0) {
      console.log(`Uploading ${attachments.length} file(s) to GitHub...`);
      const uploadedAttachments = await uploadFilesToGitHub(attachments);
      enhancedReport.attachments = uploadedAttachments;
    }

    // Step 3: Create GitHub issue
    console.log('Creating GitHub issue...');
    const githubIssueUrl = await createGitHubIssue(enhancedReport);

    // Step 4: Create ClickUp task
    console.log('Creating ClickUp task...');
    const clickupTaskUrl = await createClickUpTask(enhancedReport, githubIssueUrl);

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
      },
      {
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  } catch (error) {
    console.error('Error processing bug report:', error);
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
