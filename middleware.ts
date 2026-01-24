import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to handle CORS for Chrome Extension API access and request correlation IDs
 *
 * Allows the Chrome extension to make API calls to the bug tracker
 * from chrome-extension:// origins
 *
 * Generates a unique correlation ID (UUID) for each request to enable
 * end-to-end request tracing through all service calls
 */
export function middleware(request: NextRequest) {
  // Generate unique correlation ID for request tracing
  const correlationId = crypto.randomUUID();

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow all origins (including chrome-extension://)
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
        'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
        'X-Request-ID': correlationId,
      },
    });
  }

  // Clone the response and attach correlation ID to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('X-Request-ID', correlationId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add CORS headers and correlation ID to all API responses
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  response.headers.set('X-Request-ID', correlationId);

  return response;
}

// Apply middleware only to API routes
export const config = {
  matcher: '/api/:path*',
};
