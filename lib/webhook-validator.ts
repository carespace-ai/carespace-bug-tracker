import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies GitHub webhook signature using HMAC-SHA256
 * GitHub sends the signature in the X-Hub-Signature-256 header
 * Format: sha256=<hash>
 *
 * @param payload - The raw request body as string
 * @param signature - The signature from X-Hub-Signature-256 header
 * @param secret - The webhook secret (GITHUB_WEBHOOK_SECRET)
 * @returns boolean indicating if signature is valid
 */
export function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  // GitHub signature format: "sha256=<hash>"
  if (!signature.startsWith('sha256=')) {
    return false;
  }

  const signatureHash = signature.substring(7); // Remove "sha256=" prefix

  // Compute expected signature
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedHash = hmac.digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    const signatureBuffer = Buffer.from(signatureHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    // Ensure buffers are same length before comparison
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    // Invalid hex string or other error
    return false;
  }
}

/**
 * Verifies ClickUp webhook signature using HMAC-SHA256
 * ClickUp sends the signature in the X-Signature header
 *
 * @param payload - The raw request body as string
 * @param signature - The signature from X-Signature header
 * @param secret - The webhook secret (CLICKUP_WEBHOOK_SECRET)
 * @returns boolean indicating if signature is valid
 */
export function verifyClickUpSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  // Compute expected signature
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedHash = hmac.digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    // Ensure buffers are same length before comparison
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    // Invalid hex string or other error
    return false;
  }
}
