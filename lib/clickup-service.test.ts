import axios from 'axios';
import { createClickUpTask, uploadFilesToClickUpTask, updateTaskStatus } from './clickup-service';
import { EnhancedBugReport } from './types';
import * as retryHandler from './retry-handler';
import * as circuitBreaker from './circuit-breaker';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ClickUp Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    circuitBreaker.resetCircuit('clickup');

    // Set environment variables before importing
    process.env = {
      ...originalEnv,
      CLICKUP_API_KEY: 'test-api-key',
      CLICKUP_LIST_ID: 'test-list-id'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createClickUpTask', () => {
    const mockEnhancedReport: EnhancedBugReport = {
      title: 'Test Bug',
      enhancedDescription: 'Test description',
      technicalContext: 'Test context',
      severity: 'high',
      category: 'bug',
      priority: 2,
      suggestedLabels: ['bug', 'high-priority'],
      claudePrompt: 'Test prompt',
      environment: 'production',
      browserInfo: 'Chrome 120'
    };

    const mockGithubUrl = 'https://github.com/org/repo/issues/123';

    it('should create a ClickUp task successfully', async () => {
      const mockResponse = {
        data: {
          id: 'task-123',
          url: 'https://app.clickup.com/t/task-123'
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await createClickUpTask(mockEnhancedReport, mockGithubUrl);

      expect(result).toBe('https://app.clickup.com/t/task-123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/list/'),
        expect.objectContaining({
          name: '[BUG] Test Bug',
          priority: 2,
          tags: ['bug', 'high-priority'],
          status: 'to do'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle network errors with retry', async () => {
      const networkError = new Error('Network error');
      mockedAxios.post
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          data: {
            id: 'task-123',
            url: 'https://app.clickup.com/t/task-123'
          }
        });

      const result = await createClickUpTask(mockEnhancedReport, mockGithubUrl);

      expect(result).toBe('https://app.clickup.com/t/task-123');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should throw error with message when all retries fail', async () => {
      const networkError = new Error('Network error');
      mockedAxios.post.mockRejectedValue(networkError);

      await expect(
        createClickUpTask(mockEnhancedReport, mockGithubUrl)
      ).rejects.toThrow('Failed to create ClickUp task: Network error');
    }, 10000);

    it('should handle undefined GitHub URL gracefully', async () => {
      const mockResponse = {
        data: {
          id: 'task-123',
          url: 'https://app.clickup.com/t/task-123'
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await createClickUpTask(mockEnhancedReport, undefined);

      expect(result).toBe('https://app.clickup.com/t/task-123');

      // Verify the task description contains the "not created" message
      const callArgs = mockedAxios.post.mock.calls[0];
      const taskData = callArgs[1] as any;
      expect(taskData.description).toContain('Not created (GitHub service unavailable)');
    });
  });

  describe('uploadFilesToClickUpTask', () => {
    it('should return early if no files provided', async () => {
      await uploadFilesToClickUpTask('task-123', []);

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should upload files successfully', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      mockedAxios.post.mockResolvedValueOnce({ data: {} });

      await uploadFilesToClickUpTask('task-123', [mockFile]);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/task/task-123/attachment'),
        expect.anything(),
        expect.objectContaining({
          headers: expect.anything()
        })
      );
    });

    it('should handle upload errors with retry', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const networkError = new Error('Network error');

      mockedAxios.post
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: {} });

      await uploadFilesToClickUpTask('task-123', [mockFile]);

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should throw error with message when upload fails', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const networkError = new Error('Network error');

      mockedAxios.post.mockRejectedValue(networkError);

      await expect(
        uploadFilesToClickUpTask('task-123', [mockFile])
      ).rejects.toThrow('Failed to upload files to ClickUp task: Network error');
    }, 10000);
  });

  describe('updateTaskStatus', () => {
    it('should update task status successfully', async () => {
      mockedAxios.put.mockResolvedValueOnce({ data: {} });

      await updateTaskStatus('task-123', 'in progress');

      expect(mockedAxios.put).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v2/task/task-123',
        { status: 'in progress' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle errors with retry', async () => {
      const networkError = new Error('Network error');
      mockedAxios.put
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: {} });

      await updateTaskStatus('task-123', 'done');

      expect(mockedAxios.put).toHaveBeenCalledTimes(2);
    });

    it('should throw error with message when update fails', async () => {
      const networkError = new Error('Network error');
      mockedAxios.put.mockRejectedValue(networkError);

      await expect(
        updateTaskStatus('task-123', 'done')
      ).rejects.toThrow('Failed to update ClickUp task status: Network error');
    }, 10000);
  });

  describe('Retry scenarios', () => {
    it('should retry on 5xx server errors', async () => {
      const mockEnhancedReport: EnhancedBugReport = {
        title: 'Test Bug',
        enhancedDescription: 'Test description',
        technicalContext: 'Test context',
        severity: 'high',
        category: 'bug',
        priority: 2,
        suggestedLabels: ['bug'],
        claudePrompt: 'Test prompt'
      };

      const error500 = new Error('Server error');
      (error500 as any).status = 500;

      mockedAxios.post
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce({
          data: {
            id: 'task-123',
            url: 'https://app.clickup.com/t/task-123'
          }
        });

      const result = await createClickUpTask(mockEnhancedReport, 'https://github.com/org/repo/issues/1');

      expect(result).toBe('https://app.clickup.com/t/task-123');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx client errors', async () => {
      const mockEnhancedReport: EnhancedBugReport = {
        title: 'Test Bug',
        enhancedDescription: 'Test description',
        technicalContext: 'Test context',
        severity: 'high',
        category: 'bug',
        priority: 2,
        suggestedLabels: ['bug'],
        claudePrompt: 'Test prompt'
      };

      const error400 = new Error('Bad request');
      (error400 as any).status = 400;

      mockedAxios.post.mockRejectedValueOnce(error400);

      await expect(
        createClickUpTask(mockEnhancedReport, 'https://github.com/org/repo/issues/1')
      ).rejects.toThrow('Failed to create ClickUp task: Bad request');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Circuit breaker integration', () => {
    it('should use circuit breaker to prevent cascade failures', async () => {
      const spy = jest.spyOn(circuitBreaker, 'executeWithCircuitBreaker');

      const mockResponse = {
        data: {
          id: 'task-123',
          url: 'https://app.clickup.com/t/task-123'
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const mockEnhancedReport: EnhancedBugReport = {
        title: 'Test Bug',
        enhancedDescription: 'Test description',
        technicalContext: 'Test context',
        severity: 'high',
        category: 'bug',
        priority: 2,
        suggestedLabels: ['bug'],
        claudePrompt: 'Test prompt'
      };

      await createClickUpTask(mockEnhancedReport, 'https://github.com/org/repo/issues/1');

      expect(spy).toHaveBeenCalledWith('clickup', expect.any(Function));

      spy.mockRestore();
    });

    it('should open circuit after threshold failures', async () => {
      // Reset circuit to ensure clean state
      circuitBreaker.resetCircuit('clickup');

      // Manually trigger circuit breaker by recording failures
      // This avoids the delays from actual retry logic in tests
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure('clickup');
      }

      const status = circuitBreaker.getCircuitStatus('clickup');
      expect(status.state).toBe(circuitBreaker.CircuitState.OPEN);
      expect(status.failureCount).toBeGreaterThanOrEqual(5);

      // Verify that requests are blocked
      const canProceed = circuitBreaker.canProceed('clickup');
      expect(canProceed).toBe(false);
    });
  });
});
