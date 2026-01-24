import { WebhookSubscription, OutgoingWebhookEventType } from './types';

// In-memory storage for MVP
// TODO: Migrate to Vercel KV for production to support multi-instance deployments
const webhookSubscriptions = new Map<string, WebhookSubscription>();

/**
 * Generates a unique ID for a webhook subscription
 * Uses timestamp and random string for uniqueness
 */
function generateWebhookId(): string {
  return `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Adds a new webhook subscription
 *
 * @param url - The URL to send webhook events to
 * @param events - Array of event types to subscribe to
 * @param secret - Secret for webhook signature verification
 * @returns The created WebhookSubscription object
 */
export function addWebhook(
  url: string,
  events: OutgoingWebhookEventType[],
  secret: string
): WebhookSubscription {
  const subscription: WebhookSubscription = {
    id: generateWebhookId(),
    url,
    events,
    secret,
    createdAt: Date.now(),
    failureCount: 0
  };

  webhookSubscriptions.set(subscription.id, subscription);

  return subscription;
}

/**
 * Removes a webhook subscription by ID
 *
 * @param id - The webhook subscription ID to remove
 * @returns true if the subscription was deleted, false if not found
 */
export function removeWebhook(id: string): boolean {
  return webhookSubscriptions.delete(id);
}

/**
 * Retrieves all webhook subscriptions that are subscribed to a specific event type
 *
 * @param eventType - The event type to filter by
 * @returns Array of WebhookSubscription objects subscribed to the event
 */
export function getWebhooksByEvent(eventType: OutgoingWebhookEventType): WebhookSubscription[] {
  const subscriptions = Array.from(webhookSubscriptions.values());
  return subscriptions.filter(subscription => subscription.events.includes(eventType));
}

/**
 * Retrieves a webhook subscription by ID
 *
 * @param id - The webhook subscription ID
 * @returns The WebhookSubscription if found, undefined otherwise
 */
export function getWebhookById(id: string): WebhookSubscription | undefined {
  return webhookSubscriptions.get(id);
}

/**
 * Updates the delivery status for a webhook subscription
 *
 * @param id - The webhook subscription ID
 * @param success - Whether the delivery was successful
 * @returns true if the subscription was updated, false if not found
 */
export function updateDeliveryStatus(id: string, success: boolean): boolean {
  const subscription = webhookSubscriptions.get(id);
  if (!subscription) {
    return false;
  }

  subscription.lastDeliveryAt = Date.now();

  if (success) {
    subscription.failureCount = 0;
  } else {
    subscription.failureCount = (subscription.failureCount || 0) + 1;
  }

  webhookSubscriptions.set(id, subscription);

  return true;
}

/**
 * Retrieves all stored webhook subscriptions
 *
 * @returns Array of all WebhookSubscription objects
 */
export function getAllWebhooks(): WebhookSubscription[] {
  return Array.from(webhookSubscriptions.values());
}

/**
 * Clears all webhook subscriptions from storage
 * Useful for testing and cleanup
 */
export function clearAllWebhooks(): void {
  webhookSubscriptions.clear();
}
