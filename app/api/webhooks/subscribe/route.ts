import { NextRequest, NextResponse } from 'next/server';
import { addWebhook } from '@/lib/webhook-storage';
import { OutgoingWebhookEventType } from '@/lib/types';

/**
 * Validates a webhook URL format
 * Must be HTTPS in production, allows HTTP for localhost in development
 */
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Allow HTTP for localhost/127.0.0.1 in development, require HTTPS otherwise
    if (parsed.protocol === 'http:') {
      const isLocalhost = parsed.hostname === 'localhost' ||
                         parsed.hostname === '127.0.0.1' ||
                         parsed.hostname.startsWith('192.168.') ||
                         parsed.hostname.startsWith('10.') ||
                         parsed.hostname.endsWith('.local');
      return isLocalhost;
    }
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates webhook event types
 * Ensures all provided events are valid OutgoingWebhookEventType values
 */
function areValidEvents(events: unknown): events is OutgoingWebhookEventType[] {
  if (!Array.isArray(events) || events.length === 0) {
    return false;
  }

  const validEventTypes: OutgoingWebhookEventType[] = [
    'bug.submitted',
    'bug.status_changed',
    'bug.resolved'
  ];

  return events.every(event =>
    typeof event === 'string' && validEventTypes.includes(event as OutgoingWebhookEventType)
  );
}

/**
 * POST /api/webhooks/subscribe
 *
 * Subscribe to outgoing webhook events
 *
 * Request body:
 * - url: string (HTTPS URL to receive webhook events, HTTP allowed for localhost)
 * - events: OutgoingWebhookEventType[] (array of event types to subscribe to)
 * - secret: string (secret for HMAC signature verification)
 *
 * Response:
 * - 201: Subscription created successfully
 * - 400: Invalid input
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
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

    if (!body.secret || typeof body.secret !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'Field "secret" is required and must be a string'
        },
        { status: 400 }
      );
    }

    if (body.secret.length < 16) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'Secret must be at least 16 characters long for security'
        },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!isValidWebhookUrl(body.url)) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'Invalid webhook URL. Must be HTTPS (or HTTP for localhost in development)'
        },
        { status: 400 }
      );
    }

    // Validate events array
    if (!areValidEvents(body.events)) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'Field "events" must be a non-empty array of valid event types: bug.submitted, bug.status_changed, bug.resolved'
        },
        { status: 400 }
      );
    }

    // Create webhook subscription
    const subscription = addWebhook(
      body.url,
      body.events as OutgoingWebhookEventType[],
      body.secret
    );

    console.log(`[Webhook] New subscription created: ${subscription.id} for events: ${subscription.events.join(', ')}`);

    return NextResponse.json(
      {
        message: 'Webhook subscription created successfully',
        subscription: {
          id: subscription.id,
          url: subscription.url,
          events: subscription.events,
          createdAt: new Date(subscription.createdAt).toISOString()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Webhook Subscribe] Error:', error);

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
        message: 'Failed to create webhook subscription'
      },
      { status: 500 }
    );
  }
}
