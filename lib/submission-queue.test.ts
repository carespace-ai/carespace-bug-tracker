import {
  addToQueue,
  getQueuedSubmission,
  getAllQueuedSubmissions,
  getRetryableSubmissions,
  updateSubmission,
  incrementRetryCount,
  removeFromQueue,
  getQueueSize,
  clearQueue,
  getQueueStats
} from './submission-queue';
import { BugReport, EnhancedBugReport } from './types';

const mockBugReport: BugReport = {
  title: 'Test Bug',
  description: 'Test description',
  severity: 'high',
  category: 'functionality'
};

const mockEnhancedReport: EnhancedBugReport = {
  ...mockBugReport,
  enhancedDescription: 'Enhanced description',
  suggestedLabels: ['bug', 'high-priority'],
  technicalContext: 'Technical context',
  claudePrompt: 'Prompt used',
  priority: 4
};

describe('Submission Queue', () => {
  beforeEach(() => {
    clearQueue();
  });

  describe('addToQueue', () => {
    it('should add a submission to the queue', () => {
      const id = addToQueue(
        mockBugReport,
        mockEnhancedReport,
        { github: 'GitHub error' },
        { clickup: true }
      );

      expect(id).toBeDefined();
      expect(id).toContain('submission-');
      expect(getQueueSize()).toBe(1);
    });

    it('should set status to "partial" when some services succeeded', () => {
      const id = addToQueue(
        mockBugReport,
        undefined,
        { github: 'GitHub error' },
        { clickup: true }
      );

      const submission = getQueuedSubmission(id);
      expect(submission?.status).toBe('partial');
      expect(submission?.successfulServices.clickup).toBe(true);
      expect(submission?.errors.github).toBe('GitHub error');
    });

    it('should set status to "pending" when all services failed', () => {
      const id = addToQueue(
        mockBugReport,
        undefined,
        { github: 'GitHub error', clickup: 'ClickUp error' },
        {}
      );

      const submission = getQueuedSubmission(id);
      expect(submission?.status).toBe('pending');
    });

    it('should store enhanced report when provided', () => {
      const id = addToQueue(
        mockBugReport,
        mockEnhancedReport,
        { github: 'Error' },
        {}
      );

      const submission = getQueuedSubmission(id);
      expect(submission?.enhancedReport).toEqual(mockEnhancedReport);
    });

    it('should initialize retry count to 0', () => {
      const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});

      const submission = getQueuedSubmission(id);
      expect(submission?.retryCount).toBe(0);
    });

    it('should set timestamp to current time', () => {
      const beforeTime = Date.now();
      const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      const afterTime = Date.now();

      const submission = getQueuedSubmission(id);
      expect(submission?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(submission?.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should throw error when queue is full', () => {
      // Fill queue to max (1000)
      for (let i = 0; i < 1000; i++) {
        addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      }

      expect(() => {
        addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      }).toThrow('Submission queue is full');
    });
  });

  describe('getQueuedSubmission', () => {
    it('should retrieve a submission by ID', () => {
      const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});

      const submission = getQueuedSubmission(id);
      expect(submission?.id).toBe(id);
      expect(submission?.bugReport).toEqual(mockBugReport);
    });

    it('should return undefined for non-existent ID', () => {
      const submission = getQueuedSubmission('non-existent-id');
      expect(submission).toBeUndefined();
    });
  });

  describe('getAllQueuedSubmissions', () => {
    it('should return all submissions when no filter provided', () => {
      addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      addToQueue(mockBugReport, undefined, { clickup: 'Error' }, { github: true });

      const submissions = getAllQueuedSubmissions();
      expect(submissions).toHaveLength(2);
    });

    it('should filter by status when provided', () => {
      addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      addToQueue(mockBugReport, undefined, { clickup: 'Error' }, { github: true });

      const pending = getAllQueuedSubmissions('pending');
      const partial = getAllQueuedSubmissions('partial');

      expect(pending).toHaveLength(1);
      expect(partial).toHaveLength(1);
    });

    it('should return empty array when queue is empty', () => {
      const submissions = getAllQueuedSubmissions();
      expect(submissions).toHaveLength(0);
    });
  });

  describe('getRetryableSubmissions', () => {
    it('should return submissions with status pending or partial', () => {
      const id1 = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      const id2 = addToQueue(mockBugReport, undefined, { clickup: 'Error' }, { github: true });
      const id3 = addToQueue(mockBugReport, undefined, { anthropic: 'Error' }, {});

      // Mark one as failed
      updateSubmission(id3, { status: 'failed' });

      const retryable = getRetryableSubmissions();
      expect(retryable).toHaveLength(2);
      expect(retryable.map(s => s.id)).toContain(id1);
      expect(retryable.map(s => s.id)).toContain(id2);
    });

    it('should exclude submissions that exceeded retry count', () => {
      const id1 = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      const id2 = addToQueue(mockBugReport, undefined, { clickup: 'Error' }, {});

      // Increment retry count beyond max
      incrementRetryCount(id1);
      incrementRetryCount(id1);
      incrementRetryCount(id1);

      const retryable = getRetryableSubmissions();
      expect(retryable).toHaveLength(1);
      expect(retryable[0].id).toBe(id2);
    });
  });

  describe('updateSubmission', () => {
    it('should update submission status', () => {
      const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});

      const updated = updateSubmission(id, { status: 'retrying' });
      expect(updated).toBe(true);

      const submission = getQueuedSubmission(id);
      expect(submission?.status).toBe('retrying');
    });

    it('should update retry count', () => {
      const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});

      updateSubmission(id, { retryCount: 2 });

      const submission = getQueuedSubmission(id);
      expect(submission?.retryCount).toBe(2);
    });

    it('should update errors', () => {
      const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});

      updateSubmission(id, { errors: { clickup: 'New error' } });

      const submission = getQueuedSubmission(id);
      expect(submission?.errors.github).toBe('Error');
      expect(submission?.errors.clickup).toBe('New error');
    });

    it('should update successfulServices', () => {
      const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});

      updateSubmission(id, { successfulServices: { github: true } });

      const submission = getQueuedSubmission(id);
      expect(submission?.successfulServices.github).toBe(true);
    });

    it('should return false for non-existent ID', () => {
      const updated = updateSubmission('non-existent-id', { status: 'failed' });
      expect(updated).toBe(false);
    });

    it('should update lastAttempt timestamp', () => {
      const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      const attemptTime = Date.now();

      updateSubmission(id, { lastAttempt: attemptTime });

      const submission = getQueuedSubmission(id);
      expect(submission?.lastAttempt).toBe(attemptTime);
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count and set status to retrying', () => {
      const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});

      const result = incrementRetryCount(id);
      expect(result).toBe(true);

      const submission = getQueuedSubmission(id);
      expect(submission?.retryCount).toBe(1);
      expect(submission?.status).toBe('retrying');
    });

    it('should set lastAttempt timestamp', () => {
      const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      const beforeTime = Date.now();

      incrementRetryCount(id);
      const afterTime = Date.now();

      const submission = getQueuedSubmission(id);
      expect(submission?.lastAttempt).toBeGreaterThanOrEqual(beforeTime);
      expect(submission?.lastAttempt).toBeLessThanOrEqual(afterTime);
    });

    it('should return false and set status to failed when max retries exceeded', () => {
      const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});

      // Max retries is 3
      incrementRetryCount(id);
      incrementRetryCount(id);
      incrementRetryCount(id);

      const result = incrementRetryCount(id);
      expect(result).toBe(false);

      const submission = getQueuedSubmission(id);
      expect(submission?.status).toBe('failed');
      expect(submission?.retryCount).toBe(3);
    });

    it('should return false for non-existent ID', () => {
      const result = incrementRetryCount('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('removeFromQueue', () => {
    it('should remove a submission from the queue', () => {
      const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});

      const removed = removeFromQueue(id);
      expect(removed).toBe(true);
      expect(getQueueSize()).toBe(0);
    });

    it('should return false for non-existent ID', () => {
      const removed = removeFromQueue('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('getQueueSize', () => {
    it('should return 0 for empty queue', () => {
      expect(getQueueSize()).toBe(0);
    });

    it('should return correct size', () => {
      addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      addToQueue(mockBugReport, undefined, { clickup: 'Error' }, {});
      addToQueue(mockBugReport, undefined, { anthropic: 'Error' }, {});

      expect(getQueueSize()).toBe(3);
    });

    it('should update after removal', () => {
      const id1 = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      const id2 = addToQueue(mockBugReport, undefined, { clickup: 'Error' }, {});

      expect(getQueueSize()).toBe(2);

      removeFromQueue(id1);
      expect(getQueueSize()).toBe(1);

      removeFromQueue(id2);
      expect(getQueueSize()).toBe(0);
    });
  });

  describe('clearQueue', () => {
    it('should remove all submissions from the queue', () => {
      addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      addToQueue(mockBugReport, undefined, { clickup: 'Error' }, {});
      addToQueue(mockBugReport, undefined, { anthropic: 'Error' }, {});

      expect(getQueueSize()).toBe(3);

      clearQueue();

      expect(getQueueSize()).toBe(0);
      expect(getAllQueuedSubmissions()).toHaveLength(0);
    });
  });

  describe('getQueueStats', () => {
    it('should return correct statistics', () => {
      const id1 = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
      const id2 = addToQueue(mockBugReport, undefined, { clickup: 'Error' }, { github: true });
      const id3 = addToQueue(mockBugReport, undefined, { anthropic: 'Error' }, {});

      updateSubmission(id3, { status: 'failed' });
      incrementRetryCount(id1);

      const stats = getQueueStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(0);
      expect(stats.retrying).toBe(1);
      expect(stats.partial).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.retryable).toBe(1); // only partial (id2) is retryable, id1 is actively retrying
    });

    it('should return zeros for empty queue', () => {
      const stats = getQueueStats();

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.retrying).toBe(0);
      expect(stats.partial).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.retryable).toBe(0);
    });
  });

  describe('Queue management', () => {
    it('should handle multiple submissions independently', () => {
      const id1 = addToQueue(mockBugReport, undefined, { github: 'Error 1' }, {});
      const id2 = addToQueue(mockBugReport, undefined, { clickup: 'Error 2' }, {});

      incrementRetryCount(id1);
      updateSubmission(id2, { status: 'failed' });

      const submission1 = getQueuedSubmission(id1);
      const submission2 = getQueuedSubmission(id2);

      expect(submission1?.retryCount).toBe(1);
      expect(submission1?.status).toBe('retrying');
      expect(submission2?.retryCount).toBe(0);
      expect(submission2?.status).toBe('failed');
    });

    it('should generate unique IDs for each submission', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const id = addToQueue(mockBugReport, undefined, { github: 'Error' }, {});
        ids.add(id);
      }

      expect(ids.size).toBe(100);
    });

    it('should maintain submission data integrity', () => {
      const customBugReport: BugReport = {
        title: 'Custom Bug',
        description: 'Custom description',
        severity: 'critical',
        category: 'security',
        stepsToReproduce: 'Steps here',
        expectedBehavior: 'Expected',
        actualBehavior: 'Actual',
        userEmail: 'user@example.com',
        environment: 'Production',
        browserInfo: 'Chrome 120'
      };

      const id = addToQueue(
        customBugReport,
        undefined,
        { github: 'GitHub error', clickup: 'ClickUp error' },
        { anthropic: true }
      );

      const submission = getQueuedSubmission(id);

      expect(submission?.bugReport).toEqual(customBugReport);
      expect(submission?.errors.github).toBe('GitHub error');
      expect(submission?.errors.clickup).toBe('ClickUp error');
      expect(submission?.successfulServices.anthropic).toBe(true);
    });
  });
});
