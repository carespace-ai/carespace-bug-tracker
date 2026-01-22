import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findSimilarBugs } from '@/lib/duplicate-detection-service';
import { DuplicateSearchRequest } from '@/lib/types';
import { getRateLimitResult } from '@/lib/rate-limiter';

const duplicateSearchSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
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
    const validationResult = duplicateSearchSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        {
          status: 400,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      );
    }

    const searchRequest: DuplicateSearchRequest = validationResult.data;

    // Search for similar bugs using AI
    const searchResult = await findSimilarBugs(searchRequest);

    return NextResponse.json(
      {
        success: true,
        similarBugs: searchResult.similarBugs,
        count: searchResult.count,
      },
      {
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  } catch (error) {
    console.error('Error searching for duplicates:', error);
    return NextResponse.json(
      {
        error: 'Failed to search for duplicates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  }
}
