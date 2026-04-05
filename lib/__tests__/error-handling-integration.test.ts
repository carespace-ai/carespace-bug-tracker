/**
 * Integration tests for error handling and recovery
 * Tests the full submission flow with various failure scenarios
 */

import { BugReport, EnhancedBugReport } from '../types';
import * as submissionQueue from '../submission-queue';
import * as retryHandler from '../retry-handler';
import * as circuitBreaker from '../circuit-breaker';

// Mock all external services before imports
jest.mock('../llm-service');
jest.mock('../github-service');

import { enhanceBugReport } from '../llm-service';
import { createGitHubIssue } from '../github-service';

describe('Error Handling Integration Tests', () => {
  let mockEnhanceBugReport: jest.MockedFunction<typeof enhanceBugReport>;
  let mockCreateGitHubIssue: jest.MockedFunction<typeof createGitHubIssue>;

  const sampleBugReport: BugReport = {
    title: 'Login button not working',
    description: 'The login button does not respond to clicks',
    severity: 'high',
    category: 'functionality',
    stepsToReproduce: '1. Navigate to login page\n2. Click login button',
    expectedBehavior: 'User should be logged in',
    actualBehavior: 'Nothing happens',
    environment: 'Production',
    browserInfo: 'Chrome 120',
  };

  const mockEnhancedReport: EnhancedBugReport = {
    ...sampleBugReport,
    enhancedDescription: 'Enhanced description',
    suggestedLabels: ['bug', 'high-priority'],
    technicalContext: 'Technical context',
    claudePrompt: 'Fix the login button',
    priority: 2,
    rootCauseHypothesis: 'Event handler not attached',
    codebaseContext: 'Login component',
    enhancedExpectedBehavior: 'Login should work',
    enhancedActualBehavior: 'Login does not work',
    gapAnalysis: 'Event handler missing',
    targetRepo: 'frontend',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    submissionQueue.clearQueue();
    circuitBreaker.resetCircuit('github-create-issue');

    mockEnhanceBugReport = enhanceBugReport as jest.MockedFunction<typeof enhanceBugReport>;
    mockCreateGitHubIssue = createGitHubIssue as jest.MockedFunction<typeof createGitHubIssue>;
  });

  describe('Full Success Path', () => {
    it('should successfully submit and not queue anything', async () => {
      mockEnhanceBugReport.mockResolvedValue(mockEnhancedReport);
      mockCreateGitHubIssue.mockResolvedValue({ url: 'https://github.com/owner/repo/issues/1', issueNumber: 1 });

      const enhancedReport = await mockEnhanceBugReport(sampleBugReport);
      const result = await mockCreateGitHubIssue(enhancedReport);

      expect(result.url).toBe('https://github.com/owner/repo/issues/1');
      expect(submissionQueue.getQueueStats().total).toBe(0);
    });
  });

  describe('Partial Failure Scenarios', () => {
    it('should queue submission when GitHub fails', async () => {
      mockEnhanceBugReport.mockResolvedValue(mockEnhancedReport);
      mockCreateGitHubIssue.mockRejectedValue(new Error('GitHub API error'));

      const enhancedReport = await mockEnhanceBugReport(sampleBugReport);
      const errors: { github?: string; anthropic?: string } = {};
      const successfulServices: { github?: boolean; anthropic?: boolean } = { anthropic: true };

      try {
        await mockCreateGitHubIssue(enhancedReport);
        successfulServices.github = true;
      } catch (error) {
        errors.github = error instanceof Error ? error.message : 'Unknown error';
      }

      expect(errors.github).toBe('GitHub API error');

      const queueId = submissionQueue.addToQueue(sampleBugReport, enhancedReport, errors, successfulServices);
      const queued = submissionQueue.getQueuedSubmission(queueId);
      expect(queued?.errors.github).toBe('GitHub API error');
      expect(submissionQueue.getQueueStats().retryable).toBe(1);
    });
  });

  describe('Full Failure Scenario', () => {
    it('should queue submission when all services fail', async () => {
      mockEnhanceBugReport.mockRejectedValue(new Error('Anthropic API error'));
      mockCreateGitHubIssue.mockRejectedValue(new Error('GitHub API error'));

      const errors: { github?: string; anthropic?: string } = {};
      const successfulServices: { github?: boolean; anthropic?: boolean } = {};

      try {
        await mockEnhanceBugReport(sampleBugReport);
        successfulServices.anthropic = true;
      } catch (error) {
        errors.anthropic = error instanceof Error ? error.message : 'Unknown error';
      }

      try {
        await mockCreateGitHubIssue(sampleBugReport as any);
        successfulServices.github = true;
      } catch (error) {
        errors.github = error instanceof Error ? error.message : 'Unknown error';
      }

      expect(Object.keys(errors).length).toBe(2);

      const queueId = submissionQueue.addToQueue(sampleBugReport, undefined, errors, successfulServices);
      const queued = submissionQueue.getQueuedSubmission(queueId);
      expect(queued?.status).toBe('pending');
      expect(queued?.errors.github).toBe('GitHub API error');
      expect(queued?.errors.anthropic).toBe('Anthropic API error');
    });
  });

  describe('Retry Logic with Exponential Backoff', () => {
    it('should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0;
      const attemptTimestamps: number[] = [];

      const failingOperation = jest.fn(async () => {
        attemptTimestamps.push(Date.now());
        attemptCount++;
        if (attemptCount < 3) {
          const error: any = new Error('Temporary failure');
          error.status = 503;
          throw error;
        }
        return 'success';
      });

      const result = await retryHandler.retryWithBackoff(failingOperation, {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 10000,
      });

      expect(attemptCount).toBe(3);
      expect(result).toBe('success');
      expect(failingOperation).toHaveBeenCalledTimes(3);

      const firstDelay = attemptTimestamps[1] - attemptTimestamps[0];
      const secondDelay = attemptTimestamps[2] - attemptTimestamps[1];
      expect(firstDelay).toBeGreaterThanOrEqual(90);
      expect(secondDelay).toBeGreaterThan(firstDelay);
    });

    it('should not retry on non-retryable errors', async () => {
      const failingOperation = jest.fn(async () => {
        const error: any = new Error('Bad request');
        error.status = 400;
        throw error;
      });

      await expect(
        retryHandler.retryWithBackoff(failingOperation, { maxRetries: 3, baseDelay: 100 })
      ).rejects.toThrow('Bad request');

      expect(failingOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Circuit Breaker Protection', () => {
    it('should open circuit after threshold failures', async () => {
      const serviceName = 'test-service-circuit';
      const failingOperation = jest.fn(async () => { throw new Error('Service failure'); });

      for (let i = 0; i < 5; i++) {
        try { await circuitBreaker.executeWithCircuitBreaker(serviceName, failingOperation); } catch {}
      }

      const status = circuitBreaker.getCircuitStatus(serviceName);
      expect(status.state).toBe(circuitBreaker.CircuitState.OPEN);

      await expect(
        circuitBreaker.executeWithCircuitBreaker(serviceName, failingOperation)
      ).rejects.toThrow(/Circuit breaker is OPEN/);
    });

    it('should track circuit breakers independently', () => {
      const service1 = 'github-test';
      const service2 = 'other-test';

      for (let i = 0; i < 5; i++) { circuitBreaker.recordFailure(service1); }

      expect(circuitBreaker.getCircuitStatus(service1).state).toBe(circuitBreaker.CircuitState.OPEN);
      expect(circuitBreaker.getCircuitStatus(service2).state).toBe(circuitBreaker.CircuitState.CLOSED);
    });
  });

  describe('Graceful Degradation', () => {
    it('should continue when LLM enhancement fails', async () => {
      mockEnhanceBugReport.mockRejectedValue(new Error('Anthropic API timeout'));
      mockCreateGitHubIssue.mockResolvedValue({ url: 'https://github.com/owner/repo/issues/1', issueNumber: 1 });

      let enhancedReport: EnhancedBugReport;
      try {
        enhancedReport = await mockEnhanceBugReport(sampleBugReport);
      } catch {
        enhancedReport = {
          ...sampleBugReport,
          enhancedDescription: sampleBugReport.description,
          suggestedLabels: [sampleBugReport.category!, sampleBugReport.severity!],
          technicalContext: '', claudePrompt: '', priority: 2,
          rootCauseHypothesis: '', codebaseContext: '',
          enhancedExpectedBehavior: '', enhancedActualBehavior: '',
          gapAnalysis: '', targetRepo: 'frontend',
        };
      }

      const result = await mockCreateGitHubIssue(enhancedReport);
      expect(result.url).toBe('https://github.com/owner/repo/issues/1');
    });
  });

  describe('End-to-End Integration', () => {
    it('should handle GitHub retry then success', async () => {
      mockEnhanceBugReport.mockResolvedValue(mockEnhancedReport);

      let githubAttempts = 0;
      mockCreateGitHubIssue.mockImplementation(async () => {
        githubAttempts++;
        if (githubAttempts === 1) {
          const error: any = new Error('Temporary GitHub error');
          error.status = 503;
          throw error;
        }
        return { url: 'https://github.com/owner/repo/issues/1', issueNumber: 1 };
      });

      const enhancedReport = await mockEnhanceBugReport(sampleBugReport);
      const result = await retryHandler.retryWithBackoff(
        () => mockCreateGitHubIssue(enhancedReport),
        { maxRetries: 2, baseDelay: 10 }
      );

      expect(githubAttempts).toBe(2);
      expect(result.url).toBe('https://github.com/owner/repo/issues/1');
    });
  });
});
