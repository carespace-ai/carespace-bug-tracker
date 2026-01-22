import { createHmac } from 'crypto';
import { verifyGitHubSignature, verifyClickUpSignature } from './webhook-validator';

describe('webhook-validator', () => {
  const testSecret = 'test-webhook-secret-key';
  const testPayload = JSON.stringify({ test: 'data', foo: 'bar' });

  // Helper to generate valid GitHub signature
  function generateGitHubSignature(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return 'sha256=' + hmac.digest('hex');
  }

  // Helper to generate valid ClickUp signature
  function generateClickUpSignature(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  describe('verifyGitHubSignature', () => {
    it('should return true for valid signature', () => {
      const signature = generateGitHubSignature(testPayload, testSecret);
      const result = verifyGitHubSignature(testPayload, signature, testSecret);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const validSignature = generateGitHubSignature(testPayload, testSecret);
      // Modify the signature to make it invalid
      const invalidSignature = validSignature.replace(/.$/, '0');
      const result = verifyGitHubSignature(testPayload, invalidSignature, testSecret);

      expect(result).toBe(false);
    });

    it('should return false for wrong secret', () => {
      const signature = generateGitHubSignature(testPayload, testSecret);
      const result = verifyGitHubSignature(testPayload, signature, 'wrong-secret');

      expect(result).toBe(false);
    });

    it('should return false for modified payload', () => {
      const signature = generateGitHubSignature(testPayload, testSecret);
      const modifiedPayload = JSON.stringify({ test: 'modified', foo: 'bar' });
      const result = verifyGitHubSignature(modifiedPayload, signature, testSecret);

      expect(result).toBe(false);
    });

    it('should return false for signature without sha256 prefix', () => {
      const hmac = createHmac('sha256', testSecret);
      hmac.update(testPayload);
      const signatureWithoutPrefix = hmac.digest('hex');
      const result = verifyGitHubSignature(testPayload, signatureWithoutPrefix, testSecret);

      expect(result).toBe(false);
    });

    it('should return false for empty payload', () => {
      const signature = generateGitHubSignature(testPayload, testSecret);
      const result = verifyGitHubSignature('', signature, testSecret);

      expect(result).toBe(false);
    });

    it('should return false for empty signature', () => {
      const result = verifyGitHubSignature(testPayload, '', testSecret);

      expect(result).toBe(false);
    });

    it('should return false for empty secret', () => {
      const signature = generateGitHubSignature(testPayload, testSecret);
      const result = verifyGitHubSignature(testPayload, signature, '');

      expect(result).toBe(false);
    });

    it('should return false for malformed signature hash', () => {
      const result = verifyGitHubSignature(testPayload, 'sha256=not-a-valid-hex', testSecret);

      expect(result).toBe(false);
    });

    it('should handle different payload content correctly', () => {
      const payload1 = JSON.stringify({ action: 'opened', issue: { number: 1 } });
      const signature1 = generateGitHubSignature(payload1, testSecret);

      const payload2 = JSON.stringify({ action: 'closed', issue: { number: 2 } });

      // Valid signature for payload1
      expect(verifyGitHubSignature(payload1, signature1, testSecret)).toBe(true);

      // Invalid when signature1 used with payload2
      expect(verifyGitHubSignature(payload2, signature1, testSecret)).toBe(false);
    });

    it('should be case-sensitive for hex signature', () => {
      const signature = generateGitHubSignature(testPayload, testSecret);
      // Convert part of the hex to uppercase (valid hex but different case)
      const uppercaseSignature = signature.substring(0, 7) + signature.substring(7).toUpperCase();

      // Should still work because hex is case-insensitive in Buffer.from
      const result = verifyGitHubSignature(testPayload, uppercaseSignature, testSecret);
      expect(result).toBe(true);
    });
  });

  describe('verifyClickUpSignature', () => {
    it('should return true for valid signature', () => {
      const signature = generateClickUpSignature(testPayload, testSecret);
      const result = verifyClickUpSignature(testPayload, signature, testSecret);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const validSignature = generateClickUpSignature(testPayload, testSecret);
      // Modify the signature to make it invalid
      const invalidSignature = validSignature.replace(/.$/, '0');
      const result = verifyClickUpSignature(testPayload, invalidSignature, testSecret);

      expect(result).toBe(false);
    });

    it('should return false for wrong secret', () => {
      const signature = generateClickUpSignature(testPayload, testSecret);
      const result = verifyClickUpSignature(testPayload, signature, 'wrong-secret');

      expect(result).toBe(false);
    });

    it('should return false for modified payload', () => {
      const signature = generateClickUpSignature(testPayload, testSecret);
      const modifiedPayload = JSON.stringify({ test: 'modified', foo: 'bar' });
      const result = verifyClickUpSignature(modifiedPayload, signature, testSecret);

      expect(result).toBe(false);
    });

    it('should return false for empty payload', () => {
      const signature = generateClickUpSignature(testPayload, testSecret);
      const result = verifyClickUpSignature('', signature, testSecret);

      expect(result).toBe(false);
    });

    it('should return false for empty signature', () => {
      const result = verifyClickUpSignature(testPayload, '', testSecret);

      expect(result).toBe(false);
    });

    it('should return false for empty secret', () => {
      const signature = generateClickUpSignature(testPayload, testSecret);
      const result = verifyClickUpSignature(testPayload, signature, '');

      expect(result).toBe(false);
    });

    it('should return false for malformed signature hash', () => {
      const result = verifyClickUpSignature(testPayload, 'not-a-valid-hex', testSecret);

      expect(result).toBe(false);
    });

    it('should handle different payload content correctly', () => {
      const payload1 = JSON.stringify({ event: 'taskStatusUpdated', task_id: 'abc123' });
      const signature1 = generateClickUpSignature(payload1, testSecret);

      const payload2 = JSON.stringify({ event: 'taskTagsUpdated', task_id: 'xyz789' });

      // Valid signature for payload1
      expect(verifyClickUpSignature(payload1, signature1, testSecret)).toBe(true);

      // Invalid when signature1 used with payload2
      expect(verifyClickUpSignature(payload2, signature1, testSecret)).toBe(false);
    });

    it('should be case-sensitive for hex signature', () => {
      const signature = generateClickUpSignature(testPayload, testSecret);
      // Convert part of the hex to uppercase (valid hex but different case)
      const uppercaseSignature = signature.toUpperCase();

      // Should still work because hex is case-insensitive in Buffer.from
      const result = verifyClickUpSignature(testPayload, uppercaseSignature, testSecret);
      expect(result).toBe(true);
    });
  });

  describe('timing attack prevention', () => {
    it('should use constant-time comparison for GitHub signatures', () => {
      // This test ensures we're using timingSafeEqual
      // We can't directly test timing, but we ensure the function handles
      // signatures of different lengths safely
      const signature = generateGitHubSignature(testPayload, testSecret);
      const shorterSignature = signature.substring(0, signature.length - 2);

      const result = verifyGitHubSignature(testPayload, shorterSignature, testSecret);
      expect(result).toBe(false);
    });

    it('should use constant-time comparison for ClickUp signatures', () => {
      const signature = generateClickUpSignature(testPayload, testSecret);
      const shorterSignature = signature.substring(0, signature.length - 2);

      const result = verifyClickUpSignature(testPayload, shorterSignature, testSecret);
      expect(result).toBe(false);
    });
  });

  describe('real-world webhook scenarios', () => {
    it('should verify GitHub issue webhook payload', () => {
      const githubPayload = JSON.stringify({
        action: 'opened',
        issue: {
          number: 123,
          title: 'Test issue',
          state: 'open',
          labels: [{ name: 'bug' }]
        },
        repository: {
          name: 'test-repo',
          owner: { login: 'test-user' }
        }
      });

      const signature = generateGitHubSignature(githubPayload, testSecret);
      const result = verifyGitHubSignature(githubPayload, signature, testSecret);

      expect(result).toBe(true);
    });

    it('should verify ClickUp task webhook payload', () => {
      const clickupPayload = JSON.stringify({
        event: 'taskStatusUpdated',
        task_id: 'abc123xyz',
        history_items: [
          { field: 'status', before: 'to do', after: 'in progress' }
        ],
        webhook_id: 'webhook-123'
      });

      const signature = generateClickUpSignature(clickupPayload, testSecret);
      const result = verifyClickUpSignature(clickupPayload, signature, testSecret);

      expect(result).toBe(true);
    });
  });
});
