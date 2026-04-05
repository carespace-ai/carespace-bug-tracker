import { createHmac } from 'crypto';
import { verifyGitHubSignature } from './webhook-validator';

describe('webhook-validator', () => {
  const testSecret = 'test-webhook-secret-key';
  const testPayload = JSON.stringify({ test: 'data', foo: 'bar' });

  // Helper to generate valid GitHub signature
  function generateGitHubSignature(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return 'sha256=' + hmac.digest('hex');
  }

  describe('verifyGitHubSignature', () => {
    it('should return true for valid signature', () => {
      const signature = generateGitHubSignature(testPayload, testSecret);
      const result = verifyGitHubSignature(testPayload, signature, testSecret);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const validSignature = generateGitHubSignature(testPayload, testSecret);
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

      expect(verifyGitHubSignature(payload1, signature1, testSecret)).toBe(true);
      expect(verifyGitHubSignature(payload2, signature1, testSecret)).toBe(false);
    });

    it('should be case-sensitive for hex signature', () => {
      const signature = generateGitHubSignature(testPayload, testSecret);
      const uppercaseSignature = signature.substring(0, 7) + signature.substring(7).toUpperCase();

      const result = verifyGitHubSignature(testPayload, uppercaseSignature, testSecret);
      expect(result).toBe(true);
    });
  });

  describe('timing attack prevention', () => {
    it('should use constant-time comparison for GitHub signatures', () => {
      const signature = generateGitHubSignature(testPayload, testSecret);
      const shorterSignature = signature.substring(0, signature.length - 2);

      const result = verifyGitHubSignature(testPayload, shorterSignature, testSecret);
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
  });
});
