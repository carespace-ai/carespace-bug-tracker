import { NextRequest, NextResponse } from 'next/server';
import { removeWebhook, getAllWebhooks } from '@/lib/webhook-storage';

/**
 * DELETE /api/webhooks/unsubscribe
 *
 * Unsubscribe from webhook events by URL
 *
 * Request body:
 * - url: string (the webhook URL to unsubscribe)
 *
 * Response:
 * - 200: Unsubscribed successfully
 * - 400: Invalid input
 * - 404: Webhook not found
 * - 500: Server error
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'Field "url" is required and must be a string'
        },
        { status: 400 }
      );
    }

    // Find webhook subscription(s) with matching URL
    const allWebhooks = getAllWebhooks();
    const matchingWebhooks = allWebhooks.filter(webhook => webhook.url === body.url);

    if (matchingWebhooks.length === 0) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'No webhook subscription found for the provided URL'
        },
        { status: 404 }
      );
    }

    // Remove all matching subscriptions (in case there are duplicates)
    let removedCount = 0;
    for (const webhook of matchingWebhooks) {
      const removed = removeWebhook(webhook.id);
      if (removed) {
        removedCount++;
      }
    }

    console.log(`[Webhook] Unsubscribed ${removedCount} webhook(s) for URL: ${body.url}`);

    return NextResponse.json(
      {
        message: 'Webhook unsubscribed successfully',
        removedCount,
        url: body.url
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Webhook Unsubscribe] Error:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to unsubscribe webhook'
      },
      { status: 500 }
    );
  }
}
