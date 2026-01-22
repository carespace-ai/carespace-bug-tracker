import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to handle CORS for Chrome Extension API access
 *
 * Allows the Chrome extension to make API calls to the bug tracker
 * from chrome-extension:// origins
 */
export function middleware(request: NextRequest) {
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow all origins (including chrome-extension://)
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
      },
    });
  }

  // Clone the response
  const response = NextResponse.next();

  // Add CORS headers to all API responses
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

// Apply middleware only to API routes
export const config = {
  matcher: '/api/:path*',
};
