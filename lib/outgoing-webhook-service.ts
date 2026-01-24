/**
 * Outgoing webhook delivery service with retry logic and circuit breaker
 * Delivers webhook payloads to subscribed external services (Slack, dashboards, etc.)
 */

import crypto from 'crypto';
import {
  OutgoingWebhookPayload,
  WebhookSubscription,
  OutgoingWebhookEventType
} from './types';
import { retryWithBackoff } from './retry-handler';
import { executeWithCircuitBreaker } from './circuit-breaker';
import { updateDeliveryStatus, getWebhooksByEvent } from './webhook-storage';

export interface WebhookDeliveryResult {
  success: boolean;
  webhookId: string;
  statusCode?: number;
  error?: string;
  attempts?: number;
}

/**
 * Generates HMAC-SHA256 signature for webhook payload
 * @param payload - The webhook payload to sign
 * @param secret - The webhook secret
 * @returns The hex-encoded signature
 */
function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Delivers webhook payload to a single subscription endpoint
 * @param subscription - The webhook subscription
 * @param payload - The webhook payload to deliver
 * @returns Promise resolving to delivery result
 */
export async function deliverWebhook(
  subscription: WebhookSubscription,
  payload: OutgoingWebhookPayload
): Promise<WebhookDeliveryResult> {
  const { id: webhookId, url, secret } = subscription;
  const circuitName = `webhook_${webhookId}`;

  // Serialize payload
  const payloadString = JSON.stringify(payload);

  // Generate signature
  const signature = generateSignature(payloadString, secret);

  try {
    // Execute with circuit breaker and retry logic
    const result = await executeWithCircuitBreaker(circuitName, async () => {
      return await retryWithBackoff(
        async () => {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Event': payload.event,
              'User-Agent': 'Carespace-Bug-Tracker/1.0'
            },
            body: payloadString,
            // 10 second timeout for webhook delivery
            signal: AbortSignal.timeout(10000)
          });

          // Check for successful HTTP status
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(
              `HTTP ${response.status}: ${errorText.substring(0, 200)}`
            );
          }

          return response;
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 30000,
          shouldRetry: (error: unknown) => {
            // Retry on network errors, timeouts, and 5xx errors
            if (error instanceof Error) {
              const message = error.message.toLowerCase();

              // Don't retry on 4xx client errors (except 429 Too Many Requests)
              if (message.includes('http 4') && !message.includes('http 429')) {
                return false;
              }

              // Retry on 5xx server errors
              if (message.includes('http 5')) {
                return true;
              }

              // Retry on timeout/network errors
              if (
                message.includes('timeout') ||
                message.includes('network') ||
                message.includes('aborted')
              ) {
                return true;
              }
            }

            return false;
          }
        }
      );
    });

    // Update delivery status - success
    updateDeliveryStatus(webhookId, true);

    return {
      success: true,
      webhookId,
      statusCode: result.status
    };
  } catch (error) {
    // Update delivery status - failure
    updateDeliveryStatus(webhookId, false);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      webhookId,
      error: errorMessage
    };
  }
}

/**
 * Delivers webhook payload to all subscriptions for a specific event type
 * Delivers to all subscriptions in parallel
 *
 * @param eventType - The type of event that occurred
 * @param payload - The webhook payload to deliver
 * @returns Promise resolving to array of delivery results
 */
export async function deliverWebhookToSubscribers(
  eventType: OutgoingWebhookEventType,
  payload: OutgoingWebhookPayload
): Promise<WebhookDeliveryResult[]> {
  // Get all subscriptions for this event type
  const subscriptions = getWebhooksByEvent(eventType);

  if (subscriptions.length === 0) {
    return [];
  }

  // Deliver to all subscriptions in parallel
  const deliveryPromises = subscriptions.map(subscription =>
    deliverWebhook(subscription, payload)
  );

  const results = await Promise.allSettled(deliveryPromises);

  // Extract results from settled promises
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      // Promise rejected (shouldn't happen as deliverWebhook catches errors)
      return {
        success: false,
        webhookId: subscriptions[index].id,
        error: result.reason?.message || 'Delivery failed'
      };
    }
  });
}

/**
 * Verifies webhook signature for incoming webhook requests
 * Use this to verify signatures when receiving webhooks from external services
 *
 * @param payload - The raw payload string
 * @param signature - The signature to verify
 * @param secret - The webhook secret
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    // Signatures have different lengths
    return false;
  }
}
