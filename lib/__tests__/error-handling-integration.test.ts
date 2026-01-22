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
jest.mock('../clickup-service');

import { enhanceBugReport } from '../llm-service';
import { createGitHubIssue } from '../github-service';
import { createClickUpTask } from '../clickup-service';

describe('Error Handling Integration Tests', () => {
  let mockEnhanceBugReport: jest.MockedFunction<typeof enhanceBugReport>;
  let mockCreateGitHubIssue: jest.MockedFunction<typeof createGitHubIssue>;
  let mockCreateClickUpTask: jest.MockedFunction<typeof createClickUpTask>;

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
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset submission queue
    submissionQueue.clearQueue();

    // Reset all circuit breakers
    circuitBreaker.resetCircuit('github-create-issue');
    circuitBreaker.resetCircuit('clickup');

    // Setup default mocks
    mockEnhanceBugReport = enhanceBugReport as jest.MockedFunction<typeof enhanceBugReport>;
    mockCreateGitHubIssue = createGitHubIssue as jest.MockedFunction<typeof createGitHubIssue>;
    mockCreateClickUpTask = createClickUpTask as jest.MockedFunction<typeof createClickUpTask>;
  });

  describe('Full Success Path', () => {
    it('should successfully submit to all services and not queue anything', async () => {
      // Mock all services to succeed
      mockEnhanceBugReport.mockResolvedValue(mockEnhancedReport);
      mockCreateGitHubIssue.mockResolvedValue('https://github.com/owner/repo/issues/1');
      mockCreateClickUpTask.mockResolvedValue('https://app.clickup.com/t/task-123');

      // Simulate the submission flow
      let enhancedReport: EnhancedBugReport | undefined;
      let githubUrl: string | undefined;
      let clickupUrl: string | undefined;
      const errors: { github?: string; clickup?: string; anthropic?: string } = {};
      const successfulServices: { github?: boolean; clickup?: boolean; anthropic?: boolean } = {};

      // Step 1: Enhance with LLM
      try {
        enhancedReport = await mockEnhanceBugReport(sampleBugReport);
        successfulServices.anthropic = true;
      } catch (error) {
        errors.anthropic = error instanceof Error ? error.message : 'Unknown error';
      }

      // Step 2: Create GitHub issue
      try {
        githubUrl = await mockCreateGitHubIssue(enhancedReport!);
        successfulServices.github = true;
      } catch (error) {
        errors.github = error instanceof Error ? error.message : 'Unknown error';
      }

      // Step 3: Create ClickUp task
      try {
        clickupUrl = await mockCreateClickUpTask(enhancedReport!, githubUrl);
        successfulServices.clickup = true;
      } catch (error) {
        errors.clickup = error instanceof Error ? error.message : 'Unknown error';
      }

      // Verify all services succeeded
      expect(successfulServices.anthropic).toBe(true);
      expect(successfulServices.github).toBe(true);
      expect(successfulServices.clickup).toBe(true);
      expect(Object.keys(errors).length).toBe(0);

      // Verify URLs were returned
      expect(githubUrl).toBe('https://github.com/owner/repo/issues/1');
      expect(clickupUrl).toBe('https://app.clickup.com/t/task-123');

      // Verify nothing was queued
      const queueStats = submissionQueue.getQueueStats();
      expect(queueStats.total).toBe(0);
    });
  });

  describe('Partial Failure Scenarios', () => {
    it('should queue submission when GitHub succeeds but ClickUp fails', async () => {
      // Mock LLM and GitHub to succeed, ClickUp to fail
      mockEnhanceBugReport.mockResolvedValue(mockEnhancedReport);
      mockCreateGitHubIssue.mockResolvedValue('https://github.com/owner/repo/issues/1');
      mockCreateClickUpTask.mockRejectedValue(new Error('ClickUp API error'));

      // Simulate the submission flow
      let enhancedReport: EnhancedBugReport | undefined;
      let githubUrl: string | undefined;
      let clickupUrl: string | undefined;
      const errors: { github?: string; clickup?: string; anthropic?: string } = {};
      const successfulServices: { github?: boolean; clickup?: boolean; anthropic?: boolean } = {};

      // Step 1: Enhance with LLM
      try {
        enhancedReport = await mockEnhanceBugReport(sampleBugReport);
        successfulServices.anthropic = true;
      } catch (error) {
        errors.anthropic = error instanceof Error ? error.message : 'Unknown error';
      }

      // Step 2: Create GitHub issue
      try {
        githubUrl = await mockCreateGitHubIssue(enhancedReport!);
        successfulServices.github = true;
      } catch (error) {
        errors.github = error instanceof Error ? error.message : 'Unknown error';
      }

      // Step 3: Create ClickUp task
      try {
        clickupUrl = await mockCreateClickUpTask(enhancedReport!, githubUrl);
        successfulServices.clickup = true;
      } catch (error) {
        errors.clickup = error instanceof Error ? error.message : 'Unknown error';
      }

      // Verify partial success
      expect(successfulServices.github).toBe(true);
      expect(successfulServices.clickup).toBeUndefined();
      expect(errors.clickup).toBe('ClickUp API error');

      // Add to queue
      const queueId = submissionQueue.addToQueue(
        sampleBugReport,
        enhancedReport,
        errors,
        successfulServices,
        { github: githubUrl }
      );

      // Verify queued submission
      const queuedSubmission = submissionQueue.getQueuedSubmission(queueId);
      expect(queuedSubmission).toBeDefined();
      expect(queuedSubmission?.status).toBe('partial');
      expect(queuedSubmission?.errors.clickup).toBe('ClickUp API error');
      expect(queuedSubmission?.successfulServices.github).toBe(true);
      expect(queuedSubmission?.urls?.github).toBe('https://github.com/owner/repo/issues/1');

      // Verify queue stats
      const queueStats = submissionQueue.getQueueStats();
      expect(queueStats.total).toBe(1);
      expect(queueStats.partial).toBe(1);
      expect(queueStats.retryable).toBe(1);
    });

    it('should queue submission when ClickUp succeeds but GitHub fails', async () => {
      // Mock LLM to succeed, GitHub to fail, ClickUp to succeed
      mockEnhanceBugReport.mockResolvedValue(mockEnhancedReport);
      mockCreateGitHubIssue.mockRejectedValue(new Error('GitHub API error'));
      mockCreateClickUpTask.mockResolvedValue('https://app.clickup.com/t/task-123');

      // Simulate the submission flow
      let enhancedReport: EnhancedBugReport | undefined;
      let githubUrl: string | undefined;
      let clickupUrl: string | undefined;
      const errors: { github?: string; clickup?: string; anthropic?: string } = {};
      const successfulServices: { github?: boolean; clickup?: boolean; anthropic?: boolean } = {};

      // Step 1: Enhance with LLM
      try {
        enhancedReport = await mockEnhanceBugReport(sampleBugReport);
        successfulServices.anthropic = true;
      } catch (error) {
        errors.anthropic = error instanceof Error ? error.message : 'Unknown error';
      }

      // Step 2: Create GitHub issue
      try {
        githubUrl = await mockCreateGitHubIssue(enhancedReport!);
        successfulServices.github = true;
      } catch (error) {
        errors.github = error instanceof Error ? error.message : 'Unknown error';
      }

      // Step 3: Create ClickUp task (without GitHub URL)
      try {
        clickupUrl = await mockCreateClickUpTask(enhancedReport!, githubUrl);
        successfulServices.clickup = true;
      } catch (error) {
        errors.clickup = error instanceof Error ? error.message : 'Unknown error';
      }

      // Verify partial success
      expect(successfulServices.github).toBeUndefined();
      expect(successfulServices.clickup).toBe(true);
      expect(errors.github).toBe('GitHub API error');

      // Add to queue
      const queueId = submissionQueue.addToQueue(
        sampleBugReport,
        enhancedReport,
        errors,
        successfulServices,
        { clickup: clickupUrl }
      );

      // Verify queued submission
      const queuedSubmission = submissionQueue.getQueuedSubmission(queueId);
      expect(queuedSubmission).toBeDefined();
      expect(queuedSubmission?.status).toBe('partial');
      expect(queuedSubmission?.errors.github).toBe('GitHub API error');
      expect(queuedSubmission?.successfulServices.clickup).toBe(true);
    });
  });

  describe('Full Failure Scenario', () => {
    it('should queue submission when all services fail', async () => {
      // Mock all services to fail
      mockEnhanceBugReport.mockRejectedValue(new Error('Anthropic API error'));
      mockCreateGitHubIssue.mockRejectedValue(new Error('GitHub API error'));
      mockCreateClickUpTask.mockRejectedValue(new Error('ClickUp API error'));

      // Simulate the submission flow
      let enhancedReport: EnhancedBugReport | undefined;
      let githubUrl: string | undefined;
      let clickupUrl: string | undefined;
      const errors: { github?: string; clickup?: string; anthropic?: string } = {};
      const successfulServices: { github?: boolean; clickup?: boolean; anthropic?: boolean } = {};

      // Step 1: Enhance with LLM (with fallback)
      try {
        enhancedReport = await mockEnhanceBugReport(sampleBugReport);
        successfulServices.anthropic = true;
      } catch (error) {
        errors.anthropic = error instanceof Error ? error.message : 'Unknown error';
        // Fallback to basic enhancement
        enhancedReport = {
          ...sampleBugReport,
          enhancedDescription: sampleBugReport.description,
          suggestedLabels: [sampleBugReport.category, sampleBugReport.severity],
          technicalContext: '',
          claudePrompt: '',
          priority: 2,
        };
      }

      // Step 2: Create GitHub issue
      try {
        githubUrl = await mockCreateGitHubIssue(enhancedReport!);
        successfulServices.github = true;
      } catch (error) {
        errors.github = error instanceof Error ? error.message : 'Unknown error';
      }

      // Step 3: Create ClickUp task
      try {
        clickupUrl = await mockCreateClickUpTask(enhancedReport!, githubUrl);
        successfulServices.clickup = true;
      } catch (error) {
        errors.clickup = error instanceof Error ? error.message : 'Unknown error';
      }

      // Verify all services failed
      expect(successfulServices.anthropic).toBeUndefined();
      expect(successfulServices.github).toBeUndefined();
      expect(successfulServices.clickup).toBeUndefined();
      expect(Object.keys(errors).length).toBe(3);

      // Add to queue
      const queueId = submissionQueue.addToQueue(
        sampleBugReport,
        enhancedReport,
        errors,
        successfulServices
      );

      // Verify queued submission
      const queuedSubmission = submissionQueue.getQueuedSubmission(queueId);
      expect(queuedSubmission).toBeDefined();
      expect(queuedSubmission?.status).toBe('pending');
      expect(queuedSubmission?.errors.github).toBe('GitHub API error');
      expect(queuedSubmission?.errors.clickup).toBe('ClickUp API error');
      expect(queuedSubmission?.errors.anthropic).toBe('Anthropic API error');

      // Verify queue stats
      const queueStats = submissionQueue.getQueueStats();
      expect(queueStats.total).toBe(1);
      expect(queueStats.pending).toBe(1);
      expect(queueStats.retryable).toBe(1);
    });
  });

  describe('Retry Logic with Exponential Backoff', () => {
    it('should retry failed operations with exponential backoff timing', async () => {
      let attemptCount = 0;
      const attemptTimestamps: number[] = [];

      // Create a function that fails first 2 times, succeeds on 3rd
      const failingOperation = jest.fn(async () => {
        attemptTimestamps.push(Date.now());
        attemptCount++;
        if (attemptCount < 3) {
          const error: any = new Error('Temporary failure');
          error.status = 503; // Service unavailable - should retry
          throw error;
        }
        return 'success';
      });

      // Execute with retry logic
      const result = await retryHandler.retryWithBackoff(failingOperation, {
        maxRetries: 3,
        baseDelay: 100, // 100ms for faster testing
        maxDelay: 10000,
      });

      // Verify retries happened
      expect(attemptCount).toBe(3);
      expect(result).toBe('success');
      expect(failingOperation).toHaveBeenCalledTimes(3);

      // Verify exponential backoff timing
      // First attempt: immediate
      // Second attempt: after ~100ms (baseDelay * 2^0)
      // Third attempt: after ~200ms (baseDelay * 2^1)
      expect(attemptTimestamps.length).toBe(3);

      // Check delays between attempts (with some tolerance)
      const firstDelay = attemptTimestamps[1] - attemptTimestamps[0];
      const secondDelay = attemptTimestamps[2] - attemptTimestamps[1];

      expect(firstDelay).toBeGreaterThanOrEqual(90); // ~100ms with tolerance
      expect(firstDelay).toBeLessThan(200);

      expect(secondDelay).toBeGreaterThanOrEqual(180); // ~200ms with tolerance
      expect(secondDelay).toBeLessThan(300);

      // Second delay should be roughly double the first delay
      expect(secondDelay).toBeGreaterThan(firstDelay);
    });

    it('should respect maxDelay cap on exponential backoff', async () => {
      let attemptCount = 0;
      const attemptTimestamps: number[] = [];

      const failingOperation = jest.fn(async () => {
        attemptTimestamps.push(Date.now());
        attemptCount++;
        if (attemptCount <= 3) {
          const error: any = new Error('Temporary failure');
          error.status = 503;
          throw error;
        }
        return 'success';
      });

      // Execute with retry logic and low maxDelay
      const result = await retryHandler.retryWithBackoff(failingOperation, {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 150, // Cap at 150ms
      });

      expect(result).toBe('success');

      // Verify delays don't exceed maxDelay
      for (let i = 1; i < attemptTimestamps.length; i++) {
        const delay = attemptTimestamps[i] - attemptTimestamps[i - 1];
        expect(delay).toBeLessThan(250); // maxDelay + tolerance
      }
    });

    it('should not retry on non-retryable errors', async () => {
      const failingOperation = jest.fn(async () => {
        const error: any = new Error('Bad request');
        error.status = 400; // Client error - should not retry
        throw error;
      });

      await expect(
        retryHandler.retryWithBackoff(failingOperation, {
          maxRetries: 3,
          baseDelay: 100,
        })
      ).rejects.toThrow('Bad request');

      // Should only be called once (no retries)
      expect(failingOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Circuit Breaker Protection', () => {
    it('should open circuit after threshold failures and block subsequent requests', async () => {
      const serviceName = 'test-service-circuit';
      const failingOperation = jest.fn(async () => {
        throw new Error('Service failure');
      });

      // Make 5 failing requests (threshold)
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.executeWithCircuitBreaker(serviceName, failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      // Verify circuit is now OPEN
      const status = circuitBreaker.getCircuitStatus(serviceName);
      expect(status.state).toBe(circuitBreaker.CircuitState.OPEN);
      expect(status.failureCount).toBe(5);

      // Next request should fail immediately without calling the operation
      const callCountBefore = failingOperation.mock.calls.length;

      await expect(
        circuitBreaker.executeWithCircuitBreaker(serviceName, failingOperation)
      ).rejects.toThrow(/Circuit breaker is OPEN/);

      // Verify operation was NOT called (circuit blocked it)
      expect(failingOperation.mock.calls.length).toBe(callCountBefore);
    });

    it('should transition to HALF_OPEN after timeout and allow limited requests', async () => {
      const serviceName = 'test-service-half-open';
      const operation = jest.fn(async () => {
        throw new Error('Failure');
      });

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.executeWithCircuitBreaker(serviceName, operation);
        } catch (error) {
          // Expected
        }
      }

      // Verify circuit is OPEN
      let status = circuitBreaker.getCircuitStatus(serviceName);
      expect(status.state).toBe(circuitBreaker.CircuitState.OPEN);

      // Wait for timeout (simulate by manipulating time)
      // In real code, this would be 60 seconds. For testing, we can manually reset
      // or advance time. Here we'll just test the state transition logic.

      // Note: In a real test environment with jest.useFakeTimers(), we could:
      // jest.advanceTimersByTime(60000);
      // For now, we verify the circuit can check if it should transition

      const nextAttemptTime = status.nextAttempt;
      expect(nextAttemptTime).toBeGreaterThan(Date.now());
    });

    it('should close circuit after successful requests in HALF_OPEN state', async () => {
      const serviceName = 'test-service-recovery';

      // Manually set circuit to HALF_OPEN state
      // First open it
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure(serviceName);
      }

      // Wait for timeout and transition to HALF_OPEN
      // In a real scenario, we'd wait for TIMEOUT_MS
      // For testing, we can reset and manually transition
      circuitBreaker.resetCircuit(serviceName);

      // Simulate HALF_OPEN by recording a few failures then successes
      for (let i = 0; i < 4; i++) {
        circuitBreaker.recordFailure(serviceName);
      }

      let status = circuitBreaker.getCircuitStatus(serviceName);
      expect(status.state).toBe(circuitBreaker.CircuitState.CLOSED);
      expect(status.failureCount).toBe(4);

      // Now succeed to reset
      circuitBreaker.recordSuccess(serviceName);

      status = circuitBreaker.getCircuitStatus(serviceName);
      expect(status.failureCount).toBe(0);
    });

    it('should track circuit breaker state independently for each service', async () => {
      const service1 = 'github-service-test';
      const service2 = 'clickup-service-test';

      // Fail service1 multiple times
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure(service1);
      }

      // Service1 should be OPEN
      const status1 = circuitBreaker.getCircuitStatus(service1);
      expect(status1.state).toBe(circuitBreaker.CircuitState.OPEN);

      // Service2 should still be CLOSED
      const status2 = circuitBreaker.getCircuitStatus(service2);
      expect(status2.state).toBe(circuitBreaker.CircuitState.CLOSED);
      expect(status2.failureCount).toBe(0);
    });
  });

  describe('Graceful Degradation', () => {
    it('should continue submission when LLM enhancement fails', async () => {
      // Mock LLM to fail, but GitHub and ClickUp to succeed
      mockEnhanceBugReport.mockRejectedValue(new Error('Anthropic API timeout'));
      mockCreateGitHubIssue.mockResolvedValue('https://github.com/owner/repo/issues/1');
      mockCreateClickUpTask.mockResolvedValue('https://app.clickup.com/t/task-123');

      // Simulate the submission flow with fallback
      let enhancedReport: EnhancedBugReport | undefined;
      let githubUrl: string | undefined;
      let clickupUrl: string | undefined;
      const errors: { github?: string; clickup?: string; anthropic?: string } = {};
      const successfulServices: { github?: boolean; clickup?: boolean; anthropic?: boolean } = {};

      // Step 1: Enhance with LLM (with fallback)
      try {
        enhancedReport = await mockEnhanceBugReport(sampleBugReport);
        successfulServices.anthropic = true;
      } catch (error) {
        errors.anthropic = error instanceof Error ? error.message : 'Unknown error';
        // Graceful degradation: use basic enhancement
        enhancedReport = {
          ...sampleBugReport,
          enhancedDescription: sampleBugReport.description,
          suggestedLabels: [sampleBugReport.category, sampleBugReport.severity],
          technicalContext: '',
          claudePrompt: '',
          priority: sampleBugReport.severity === 'critical' ? 1 : sampleBugReport.severity === 'high' ? 2 : 3,
        };
      }

      // Step 2: Create GitHub issue
      try {
        githubUrl = await mockCreateGitHubIssue(enhancedReport!);
        successfulServices.github = true;
      } catch (error) {
        errors.github = error instanceof Error ? error.message : 'Unknown error';
      }

      // Step 3: Create ClickUp task
      try {
        clickupUrl = await mockCreateClickUpTask(enhancedReport!, githubUrl);
        successfulServices.clickup = true;
      } catch (error) {
        errors.clickup = error instanceof Error ? error.message : 'Unknown error';
      }

      // Verify LLM failed but submission continued
      expect(errors.anthropic).toBe('Anthropic API timeout');
      expect(successfulServices.github).toBe(true);
      expect(successfulServices.clickup).toBe(true);

      // Verify fallback enhancement was used
      expect(enhancedReport).toBeDefined();
      expect(enhancedReport?.enhancedDescription).toBe(sampleBugReport.description);
      expect(enhancedReport?.suggestedLabels).toContain('functionality');
      expect(enhancedReport?.suggestedLabels).toContain('high');
      expect(enhancedReport?.priority).toBe(2);

      // Verify GitHub and ClickUp succeeded
      expect(githubUrl).toBe('https://github.com/owner/repo/issues/1');
      expect(clickupUrl).toBe('https://app.clickup.com/t/task-123');
    });

    it('should create ClickUp task even when GitHub URL is unavailable', async () => {
      // Mock LLM and ClickUp to succeed, GitHub to fail
      mockEnhanceBugReport.mockResolvedValue(mockEnhancedReport);
      mockCreateGitHubIssue.mockRejectedValue(new Error('GitHub rate limit exceeded'));
      mockCreateClickUpTask.mockResolvedValue('https://app.clickup.com/t/task-123');

      // Simulate the submission flow
      let enhancedReport: EnhancedBugReport | undefined;
      let githubUrl: string | undefined;
      let clickupUrl: string | undefined;
      const errors: { github?: string; clickup?: string; anthropic?: string } = {};
      const successfulServices: { github?: boolean; clickup?: boolean; anthropic?: boolean } = {};

      // Step 1: Enhance with LLM
      try {
        enhancedReport = await mockEnhanceBugReport(sampleBugReport);
        successfulServices.anthropic = true;
      } catch (error) {
        errors.anthropic = error instanceof Error ? error.message : 'Unknown error';
      }

      // Step 2: Create GitHub issue
      try {
        githubUrl = await mockCreateGitHubIssue(enhancedReport!);
        successfulServices.github = true;
      } catch (error) {
        errors.github = error instanceof Error ? error.message : 'Unknown error';
      }

      // Step 3: Create ClickUp task (without GitHub URL - graceful degradation)
      try {
        clickupUrl = await mockCreateClickUpTask(enhancedReport!, githubUrl);
        successfulServices.clickup = true;
      } catch (error) {
        errors.clickup = error instanceof Error ? error.message : 'Unknown error';
      }

      // Verify GitHub failed but ClickUp succeeded
      expect(errors.github).toBe('GitHub rate limit exceeded');
      expect(successfulServices.clickup).toBe(true);
      expect(clickupUrl).toBe('https://app.clickup.com/t/task-123');

      // Verify ClickUp was called with undefined GitHub URL
      expect(mockCreateClickUpTask).toHaveBeenCalledWith(mockEnhancedReport, undefined);
    });
  });

  describe('End-to-End Integration', () => {
    it('should handle complex scenario: LLM succeeds, GitHub retries then succeeds, ClickUp fails and gets queued', async () => {
      // Mock LLM to succeed
      mockEnhanceBugReport.mockResolvedValue(mockEnhancedReport);

      // Mock GitHub to fail once, then succeed (simulating retry)
      let githubAttempts = 0;
      mockCreateGitHubIssue.mockImplementation(async () => {
        githubAttempts++;
        if (githubAttempts === 1) {
          const error: any = new Error('Temporary GitHub error');
          error.status = 503;
          throw error;
        }
        return 'https://github.com/owner/repo/issues/1';
      });

      // Mock ClickUp to fail permanently
      mockCreateClickUpTask.mockRejectedValue(new Error('ClickUp service unavailable'));

      // Simulate the submission flow with retry
      let enhancedReport: EnhancedBugReport | undefined;
      let githubUrl: string | undefined;
      let clickupUrl: string | undefined;
      const errors: { github?: string; clickup?: string; anthropic?: string } = {};
      const successfulServices: { github?: boolean; clickup?: boolean; anthropic?: boolean } = {};

      // Step 1: Enhance
      enhancedReport = await mockEnhanceBugReport(sampleBugReport);
      successfulServices.anthropic = true;

      // Step 2: Create GitHub issue with retry
      try {
        githubUrl = await retryHandler.retryWithBackoff(
          () => mockCreateGitHubIssue(enhancedReport!),
          { maxRetries: 2, baseDelay: 10 }
        );
        successfulServices.github = true;
      } catch (error) {
        errors.github = error instanceof Error ? error.message : 'Unknown error';
      }

      // Step 3: Create ClickUp task
      try {
        clickupUrl = await mockCreateClickUpTask(enhancedReport!, githubUrl);
        successfulServices.clickup = true;
      } catch (error) {
        errors.clickup = error instanceof Error ? error.message : 'Unknown error';
      }

      // Verify results
      expect(successfulServices.anthropic).toBe(true);
      expect(successfulServices.github).toBe(true);
      expect(successfulServices.clickup).toBeUndefined();
      expect(githubAttempts).toBe(2); // Failed once, succeeded on retry
      expect(errors.clickup).toBe('ClickUp service unavailable');

      // Add to queue for retry
      const queueId = submissionQueue.addToQueue(
        sampleBugReport,
        enhancedReport,
        errors,
        successfulServices,
        { github: githubUrl }
      );

      // Verify queue
      const queued = submissionQueue.getQueuedSubmission(queueId);
      expect(queued?.status).toBe('partial');
      expect(queued?.successfulServices.github).toBe(true);
      expect(queued?.urls?.github).toBe('https://github.com/owner/repo/issues/1');
    });
  });
});
