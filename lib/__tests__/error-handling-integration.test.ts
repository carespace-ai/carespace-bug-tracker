/**
 * Integration tests for error handling and recovery
 * Tests the full submission flow with various failure scenarios
 */

import { BugReport, EnhancedBugReport } from '../types';
import * as submissionQueue from '../submission-queue';
import * as retryHandler from '../retry-handler';
import * as circuitBreaker from '../circuit-breaker';

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

  describe('Failure Scenarios', () => {
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
      expect(submissionQueue.getQueuedSubmission(queueId)?.errors.github).toBe('GitHub API error');
    });

    it('should queue submission when all services fail', async () => {
      mockEnhanceBugReport.mockRejectedValue(new Error('Anthropic API error'));
      mockCreateGitHubIssue.mockRejectedValue(new Error('GitHub API error'));

      const errors: { github?: string; anthropic?: string } = {};
      const successfulServices: { github?: boolean; anthropic?: boolean } = {};

      try { await mockEnhanceBugReport(sampleBugReport); successfulServices.anthropic = true; }
      catch (e) { errors.anthropic = e instanceof Error ? e.message : 'Unknown error'; }

      try { await mockCreateGitHubIssue(sampleBugReport as any); successfulServices.github = true; }
      catch (e) { errors.github = e instanceof Error ? e.message : 'Unknown error'; }

      const queueId = submissionQueue.addToQueue(sampleBugReport, undefined, errors, successfulServices);
      const queued = submissionQueue.getQueuedSubmission(queueId);
      expect(queued?.status).toBe('pending');
      expect(queued?.errors.github).toBe('GitHub API error');
      expect(queued?.errors.anthropic).toBe('Anthropic API error');
    });
  });

  describe('Retry Logic', () => {
    it('should retry with exponential backoff', async () => {
      let attemptCount = 0;
      const failingOp = jest.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) { const e: any = new Error('Fail'); e.status = 503; throw e; }
        return 'success';
      });

      const result = await retryHandler.retryWithBackoff(failingOp, { maxRetries: 3, baseDelay: 100, maxDelay: 10000 });
      expect(attemptCount).toBe(3);
      expect(result).toBe('success');
    });

    it('should not retry on 4xx errors', async () => {
      const failingOp = jest.fn(async () => { const e: any = new Error('Bad request'); e.status = 400; throw e; });
      await expect(retryHandler.retryWithBackoff(failingOp, { maxRetries: 3, baseDelay: 100 })).rejects.toThrow('Bad request');
      expect(failingOp).toHaveBeenCalledTimes(1);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open after threshold failures', async () => {
      const svc = 'test-circuit';
      const op = jest.fn(async () => { throw new Error('fail'); });
      for (let i = 0; i < 5; i++) { try { await circuitBreaker.executeWithCircuitBreaker(svc, op); } catch {} }
      expect(circuitBreaker.getCircuitStatus(svc).state).toBe(circuitBreaker.CircuitState.OPEN);
      await expect(circuitBreaker.executeWithCircuitBreaker(svc, op)).rejects.toThrow(/Circuit breaker is OPEN/);
    });

    it('should track circuits independently', () => {
      for (let i = 0; i < 5; i++) { circuitBreaker.recordFailure('svc1'); }
      expect(circuitBreaker.getCircuitStatus('svc1').state).toBe(circuitBreaker.CircuitState.OPEN);
      expect(circuitBreaker.getCircuitStatus('svc2').state).toBe(circuitBreaker.CircuitState.CLOSED);
    });
  });

  describe('Graceful Degradation', () => {
    it('should continue when LLM fails', async () => {
      mockEnhanceBugReport.mockRejectedValue(new Error('Anthropic timeout'));
      mockCreateGitHubIssue.mockResolvedValue({ url: 'https://github.com/owner/repo/issues/1', issueNumber: 1 });

      let report: EnhancedBugReport;
      try { report = await mockEnhanceBugReport(sampleBugReport); }
      catch {
        report = {
          ...sampleBugReport, enhancedDescription: sampleBugReport.description,
          suggestedLabels: [sampleBugReport.category!, sampleBugReport.severity!],
          technicalContext: '', claudePrompt: '', priority: 2,
          rootCauseHypothesis: '', codebaseContext: '',
          enhancedExpectedBehavior: '', enhancedActualBehavior: '',
          gapAnalysis: '', targetRepo: 'frontend',
        };
      }

      const result = await mockCreateGitHubIssue(report);
      expect(result.url).toBe('https://github.com/owner/repo/issues/1');
    });
  });

  describe('End-to-End', () => {
    it('should handle GitHub retry then success', async () => {
      mockEnhanceBugReport.mockResolvedValue(mockEnhancedReport);
      let attempts = 0;
      mockCreateGitHubIssue.mockImplementation(async () => {
        attempts++;
        if (attempts === 1) { const e: any = new Error('Temp error'); e.status = 503; throw e; }
        return { url: 'https://github.com/owner/repo/issues/1', issueNumber: 1 };
      });

      const enhanced = await mockEnhanceBugReport(sampleBugReport);
      const result = await retryHandler.retryWithBackoff(
        () => mockCreateGitHubIssue(enhanced),
        { maxRetries: 2, baseDelay: 10 }
      );
      expect(attempts).toBe(2);
      expect(result.url).toBe('https://github.com/owner/repo/issues/1');
    });
  });
});
