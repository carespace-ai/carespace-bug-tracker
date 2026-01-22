import {
  syncStatusToClickUp,
  syncStatusToGitHub,
  syncCommentToClickUp,
  syncCommentToGitHub,
  syncLabelsToClickUp,
  syncLabelsToGitHub
} from './sync-service';
import * as clickupService from './clickup-service';
import * as githubService from './github-service';
import * as syncStorage from './sync-storage';
import { SyncMapping } from './types';

// Mock the external service modules
jest.mock('./clickup-service');
jest.mock('./github-service');
jest.mock('./sync-storage');

describe('sync-service', () => {
  // Mock data
  const mockGithubIssueId = '123';
  const mockClickupTaskId = 'task_abc123';
  const baseTimestamp = Date.now();

  const mockMapping: SyncMapping = {
    githubIssueId: mockGithubIssueId,
    clickupTaskId: mockClickupTaskId,
    lastSyncedAt: baseTimestamp,
    syncDirection: 'bidirectional'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncStatusToClickUp', () => {
    it('should sync status when mapping exists and no timestamp provided', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);
      (clickupService.updateTaskStatus as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const result = await syncStatusToClickUp(mockGithubIssueId, 'closed');

      expect(result).toBe(true);
      expect(syncStorage.getMapping).toHaveBeenCalledWith(mockGithubIssueId);
      expect(clickupService.updateTaskStatus).toHaveBeenCalledWith(mockClickupTaskId, 'complete');
      expect(syncStorage.updateSyncTimestamp).toHaveBeenCalledWith(mockGithubIssueId);
    });

    it('should return false when no mapping exists', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(undefined);

      const result = await syncStatusToClickUp(mockGithubIssueId, 'closed');

      expect(result).toBe(false);
      expect(clickupService.updateTaskStatus).not.toHaveBeenCalled();
      expect(syncStorage.updateSyncTimestamp).not.toHaveBeenCalled();
    });

    it('should skip sync when event is older than last sync (conflict resolution)', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);

      // Event timestamp is older than lastSyncedAt
      const oldTimestamp = baseTimestamp - 1000;
      const result = await syncStatusToClickUp(mockGithubIssueId, 'closed', oldTimestamp);

      expect(result).toBe(false);
      expect(clickupService.updateTaskStatus).not.toHaveBeenCalled();
      expect(syncStorage.updateSyncTimestamp).not.toHaveBeenCalled();
    });

    it('should sync when event is newer than last sync (conflict resolution)', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);
      (clickupService.updateTaskStatus as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      // Event timestamp is newer than lastSyncedAt
      const newTimestamp = baseTimestamp + 1000;
      const result = await syncStatusToClickUp(mockGithubIssueId, 'open', newTimestamp);

      expect(result).toBe(true);
      expect(clickupService.updateTaskStatus).toHaveBeenCalledWith(mockClickupTaskId, 'to do');
      expect(syncStorage.updateSyncTimestamp).toHaveBeenCalledWith(mockGithubIssueId);
    });

    it('should map open status correctly', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);
      (clickupService.updateTaskStatus as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      await syncStatusToClickUp(mockGithubIssueId, 'open');

      expect(clickupService.updateTaskStatus).toHaveBeenCalledWith(mockClickupTaskId, 'to do');
    });

    it('should throw error for unknown GitHub status', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);

      await expect(
        syncStatusToClickUp(mockGithubIssueId, 'invalid' as any)
      ).rejects.toThrow('Failed to sync status to ClickUp');
    });

    it('should handle API errors', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);
      (clickupService.updateTaskStatus as jest.Mock).mockRejectedValue(new Error('API error'));

      await expect(
        syncStatusToClickUp(mockGithubIssueId, 'closed')
      ).rejects.toThrow('Failed to sync status to ClickUp');
    });
  });

  describe('syncStatusToGitHub', () => {
    it('should sync status when mapping exists', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);
      (githubService.updateIssueStatus as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const result = await syncStatusToGitHub(mockClickupTaskId, 'complete');

      expect(result).toBe(true);
      expect(syncStorage.getMappingByClickUpId).toHaveBeenCalledWith(mockClickupTaskId);
      expect(githubService.updateIssueStatus).toHaveBeenCalledWith(123, 'closed');
      expect(syncStorage.updateSyncTimestamp).toHaveBeenCalledWith(mockGithubIssueId);
    });

    it('should return false when no mapping exists', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(undefined);

      const result = await syncStatusToGitHub(mockClickupTaskId, 'complete');

      expect(result).toBe(false);
      expect(githubService.updateIssueStatus).not.toHaveBeenCalled();
    });

    it('should skip sync when event is older than last sync (conflict resolution)', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);

      const oldTimestamp = baseTimestamp - 1000;
      const result = await syncStatusToGitHub(mockClickupTaskId, 'complete', oldTimestamp);

      expect(result).toBe(false);
      expect(githubService.updateIssueStatus).not.toHaveBeenCalled();
    });

    it('should sync when event is newer than last sync (conflict resolution)', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);
      (githubService.updateIssueStatus as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const newTimestamp = baseTimestamp + 1000;
      const result = await syncStatusToGitHub(mockClickupTaskId, 'in progress', newTimestamp);

      expect(result).toBe(true);
      expect(githubService.updateIssueStatus).toHaveBeenCalledWith(123, 'open');
    });

    it('should map "to do" status correctly', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);
      (githubService.updateIssueStatus as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      await syncStatusToGitHub(mockClickupTaskId, 'to do');

      expect(githubService.updateIssueStatus).toHaveBeenCalledWith(123, 'open');
    });

    it('should map "in progress" status correctly', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);
      (githubService.updateIssueStatus as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      await syncStatusToGitHub(mockClickupTaskId, 'in progress');

      expect(githubService.updateIssueStatus).toHaveBeenCalledWith(123, 'open');
    });

    it('should default to open for unknown ClickUp status', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);
      (githubService.updateIssueStatus as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      await syncStatusToGitHub(mockClickupTaskId, 'unknown status');

      expect(githubService.updateIssueStatus).toHaveBeenCalledWith(123, 'open');
    });

    it('should handle case-insensitive status mapping', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);
      (githubService.updateIssueStatus as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      await syncStatusToGitHub(mockClickupTaskId, 'COMPLETE');

      expect(githubService.updateIssueStatus).toHaveBeenCalledWith(123, 'closed');
    });
  });

  describe('syncCommentToClickUp', () => {
    it('should sync comment when mapping exists', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);
      (clickupService.addCommentToTask as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const result = await syncCommentToClickUp(mockGithubIssueId, 'Test comment', 'testuser');

      expect(result).toBe(true);
      expect(clickupService.addCommentToTask).toHaveBeenCalledWith(
        mockClickupTaskId,
        '**From GitHub (@testuser):**\n\nTest comment'
      );
      expect(syncStorage.updateSyncTimestamp).toHaveBeenCalledWith(mockGithubIssueId);
    });

    it('should return false when no mapping exists', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(undefined);

      const result = await syncCommentToClickUp(mockGithubIssueId, 'Test comment', 'testuser');

      expect(result).toBe(false);
      expect(clickupService.addCommentToTask).not.toHaveBeenCalled();
    });

    it('should skip sync when event is older than last sync (conflict resolution)', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);

      const oldTimestamp = baseTimestamp - 1000;
      const result = await syncCommentToClickUp(mockGithubIssueId, 'Test comment', 'testuser', oldTimestamp);

      expect(result).toBe(false);
      expect(clickupService.addCommentToTask).not.toHaveBeenCalled();
    });

    it('should sync when event is newer than last sync (conflict resolution)', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);
      (clickupService.addCommentToTask as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const newTimestamp = baseTimestamp + 1000;
      const result = await syncCommentToClickUp(mockGithubIssueId, 'Test comment', 'testuser', newTimestamp);

      expect(result).toBe(true);
      expect(clickupService.addCommentToTask).toHaveBeenCalled();
    });
  });

  describe('syncCommentToGitHub', () => {
    it('should sync comment when mapping exists', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);
      (githubService.addCommentToIssue as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const result = await syncCommentToGitHub(mockClickupTaskId, 'Test comment', 'testuser');

      expect(result).toBe(true);
      expect(githubService.addCommentToIssue).toHaveBeenCalledWith(
        123,
        '**From ClickUp (@testuser):**\n\nTest comment'
      );
      expect(syncStorage.updateSyncTimestamp).toHaveBeenCalledWith(mockGithubIssueId);
    });

    it('should return false when no mapping exists', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(undefined);

      const result = await syncCommentToGitHub(mockClickupTaskId, 'Test comment', 'testuser');

      expect(result).toBe(false);
      expect(githubService.addCommentToIssue).not.toHaveBeenCalled();
    });

    it('should skip sync when event is older than last sync (conflict resolution)', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);

      const oldTimestamp = baseTimestamp - 1000;
      const result = await syncCommentToGitHub(mockClickupTaskId, 'Test comment', 'testuser', oldTimestamp);

      expect(result).toBe(false);
      expect(githubService.addCommentToIssue).not.toHaveBeenCalled();
    });

    it('should sync when event is newer than last sync (conflict resolution)', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);
      (githubService.addCommentToIssue as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const newTimestamp = baseTimestamp + 1000;
      const result = await syncCommentToGitHub(mockClickupTaskId, 'Test comment', 'testuser', newTimestamp);

      expect(result).toBe(true);
      expect(githubService.addCommentToIssue).toHaveBeenCalled();
    });
  });

  describe('syncLabelsToClickUp', () => {
    it('should sync labels when mapping exists', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);
      (clickupService.updateTaskTags as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const labels = ['bug', 'urgent'];
      const result = await syncLabelsToClickUp(mockGithubIssueId, labels);

      expect(result).toBe(true);
      expect(clickupService.updateTaskTags).toHaveBeenCalledWith(mockClickupTaskId, labels);
      expect(syncStorage.updateSyncTimestamp).toHaveBeenCalledWith(mockGithubIssueId);
    });

    it('should return false when no mapping exists', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(undefined);

      const result = await syncLabelsToClickUp(mockGithubIssueId, ['bug']);

      expect(result).toBe(false);
      expect(clickupService.updateTaskTags).not.toHaveBeenCalled();
    });

    it('should skip sync when event is older than last sync (conflict resolution)', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);

      const oldTimestamp = baseTimestamp - 1000;
      const result = await syncLabelsToClickUp(mockGithubIssueId, ['bug'], oldTimestamp);

      expect(result).toBe(false);
      expect(clickupService.updateTaskTags).not.toHaveBeenCalled();
    });

    it('should sync when event is newer than last sync (conflict resolution)', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);
      (clickupService.updateTaskTags as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const newTimestamp = baseTimestamp + 1000;
      const result = await syncLabelsToClickUp(mockGithubIssueId, ['bug'], newTimestamp);

      expect(result).toBe(true);
      expect(clickupService.updateTaskTags).toHaveBeenCalled();
    });

    it('should handle empty labels array', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);
      (clickupService.updateTaskTags as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const result = await syncLabelsToClickUp(mockGithubIssueId, []);

      expect(result).toBe(true);
      expect(clickupService.updateTaskTags).toHaveBeenCalledWith(mockClickupTaskId, []);
    });
  });

  describe('syncLabelsToGitHub', () => {
    it('should sync tags when mapping exists', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);
      (githubService.updateIssueLabels as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const tags = ['bug', 'urgent'];
      const result = await syncLabelsToGitHub(mockClickupTaskId, tags);

      expect(result).toBe(true);
      expect(githubService.updateIssueLabels).toHaveBeenCalledWith(123, tags);
      expect(syncStorage.updateSyncTimestamp).toHaveBeenCalledWith(mockGithubIssueId);
    });

    it('should return false when no mapping exists', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(undefined);

      const result = await syncLabelsToGitHub(mockClickupTaskId, ['bug']);

      expect(result).toBe(false);
      expect(githubService.updateIssueLabels).not.toHaveBeenCalled();
    });

    it('should skip sync when event is older than last sync (conflict resolution)', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);

      const oldTimestamp = baseTimestamp - 1000;
      const result = await syncLabelsToGitHub(mockClickupTaskId, ['bug'], oldTimestamp);

      expect(result).toBe(false);
      expect(githubService.updateIssueLabels).not.toHaveBeenCalled();
    });

    it('should sync when event is newer than last sync (conflict resolution)', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);
      (githubService.updateIssueLabels as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const newTimestamp = baseTimestamp + 1000;
      const result = await syncLabelsToGitHub(mockClickupTaskId, ['bug'], newTimestamp);

      expect(result).toBe(true);
      expect(githubService.updateIssueLabels).toHaveBeenCalled();
    });

    it('should handle empty tags array', async () => {
      (syncStorage.getMappingByClickUpId as jest.Mock).mockReturnValue(mockMapping);
      (githubService.updateIssueLabels as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const result = await syncLabelsToGitHub(mockClickupTaskId, []);

      expect(result).toBe(true);
      expect(githubService.updateIssueLabels).toHaveBeenCalledWith(123, []);
    });
  });

  describe('conflict resolution edge cases', () => {
    it('should sync when event timestamp equals last sync timestamp', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);
      (clickupService.updateTaskStatus as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      // Event timestamp equals lastSyncedAt (not less than)
      const result = await syncStatusToClickUp(mockGithubIssueId, 'closed', baseTimestamp);

      expect(result).toBe(true);
      expect(clickupService.updateTaskStatus).toHaveBeenCalled();
    });

    it('should handle very old timestamps', async () => {
      // Create a mapping with a recent timestamp
      const recentMapping = {
        ...mockMapping,
        lastSyncedAt: Date.now()
      };
      (syncStorage.getMapping as jest.Mock).mockReturnValue(recentMapping);

      const veryOldTimestamp = 1000; // Very old timestamp (1 second after epoch)
      const result = await syncStatusToClickUp(mockGithubIssueId, 'closed', veryOldTimestamp);

      expect(result).toBe(false);
      expect(clickupService.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('should handle future timestamps', async () => {
      (syncStorage.getMapping as jest.Mock).mockReturnValue(mockMapping);
      (clickupService.updateTaskStatus as jest.Mock).mockResolvedValue(undefined);
      (syncStorage.updateSyncTimestamp as jest.Mock).mockReturnValue(true);

      const futureTimestamp = Date.now() + 100000;
      const result = await syncStatusToClickUp(mockGithubIssueId, 'closed', futureTimestamp);

      expect(result).toBe(true);
      expect(clickupService.updateTaskStatus).toHaveBeenCalled();
    });
  });
});
