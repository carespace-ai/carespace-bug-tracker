import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { storeUserConfirmation } from '@/lib/github-service';
import { getRateLimitResult } from '@/lib/rate-limiter';

const confirmDuplicateSchema = z.object({
  issueNumber: z.number().int().positive('Issue number must be a positive integer'),
  userEmail: z.string().email('Invalid email address').optional(),
  userDescription: z.string().min(10, 'Description must be at least 10 characters'),
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
    const validationResult = confirmDuplicateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        {
          status: 400,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      );
    }

    const { issueNumber, userEmail, userDescription } = validationResult.data;

    // Store confirmation as a GitHub comment
    await storeUserConfirmation(
      issueNumber,
      userEmail || 'anonymous@example.com',
      userDescription
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Duplicate confirmation stored successfully',
      },
      {
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  } catch (error) {
    console.error('Error confirming duplicate:', error);
    return NextResponse.json(
      {
        error: 'Failed to confirm duplicate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  }
}
