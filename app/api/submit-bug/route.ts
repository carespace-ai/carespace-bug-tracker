import { NextRequest, NextResponse } from 'next/server';
import { enhanceBugReport } from '@/lib/llm-service';
import { createGitHubIssue, uploadFilesToGitHub } from '@/lib/github-service';
import { createClickUpTask } from '@/lib/clickup-service';
import { BugReport } from '@/lib/types';
import { getRateLimitResult } from '@/lib/rate-limiter';
import { bugReportSchema } from '@/lib/validation/bug-report-schema';

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
 * @param request - The incoming Next.js request
 * @returns The client's IP address
 *
 * @important GDPR/Privacy Compliance
 * IP addresses are considered Personally Identifiable Information (PII) under GDPR
 * and other privacy regulations. They MUST NOT be logged or exposed in error messages.
 * Use IP addresses only for:
 * - Rate limiting (processed in-memory, not persisted)
 * - Security monitoring (with proper data retention policies)
 *
 * Never include IP addresses in:
 * - Console logs or debug statements
 * - Error messages sent to clients
 * - External service payloads (GitHub issues, ClickUp tasks, etc.)
 * - Any persistent storage without explicit user consent and data protection measures
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
    // Parse FormData instead of JSON
    const formData = await request.formData();

    // Extract form fields from FormData
    // Helper to convert empty strings to undefined for optional fields
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

    // Extract file attachments
    const attachments = formData.getAll('attachments') as File[];

    // Validate file attachments
    const maxFileCount = 5;
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'video/mp4',
      'video/quicktime',
      'text/plain',
      'application/pdf',
      'application/json'
    ];

    // Allowed file extensions (fallback for when MIME type is application/octet-stream)
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
      '.mp4', '.mov',
      '.txt', '.log',
      '.pdf',
      '.json'
    ];

    if (attachments.length > maxFileCount) {
      return NextResponse.json(
        { error: `Too many files. Maximum ${maxFileCount} files allowed.` },
        { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    for (const file of attachments) {
      // Skip validation for empty/placeholder files
      if (!file || file.size === 0) {
        continue;
      }

      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 10MB` },
          { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
        );
      }

      // Validate by MIME type or file extension
      const fileName = file.name || 'unknown';
      const lastDotIndex = fileName.lastIndexOf('.');
      const fileExtension = lastDotIndex !== -1 ? fileName.toLowerCase().substring(lastDotIndex) : '';

      const isValidType = allowedTypes.includes(file.type);
      const isValidExtension = fileExtension && allowedExtensions.includes(fileExtension);
      const isOctetStreamWithValidExtension = file.type === 'application/octet-stream' && isValidExtension;

      // Debug logging (remove in production)
      console.log(`File validation - name: ${fileName}, type: ${file.type}, ext: ${fileExtension}, validType: ${isValidType}, validExt: ${isValidExtension}`);

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
      // Format validation errors for better readability
      const errorMessages = validationResult.error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');

      return NextResponse.json(
        {
          error: 'Invalid input',
          details: errorMessages,
          validationErrors: validationResult.error.issues
        },
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

    // Step 2: Upload attachments to GitHub (if any)
    // Filter out empty/placeholder files before uploading
    const validAttachments = attachments.filter(file => file && file.size > 0);

    if (validAttachments.length > 0) {
      console.log(`Uploading ${validAttachments.length} attachments to GitHub...`);
      const uploadedAttachments = await uploadFilesToGitHub(validAttachments);
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
            targetRepo: enhancedReport.targetRepo,
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
