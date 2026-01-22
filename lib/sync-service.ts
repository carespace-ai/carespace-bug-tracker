import { updateTaskStatus, updateTaskTags, addCommentToTask } from './clickup-service';
import { addCommentToIssue, updateIssueStatus, updateIssueLabels } from './github-service';
import { getMapping, getMappingByClickUpId, updateSyncTimestamp } from './sync-storage';

/**
 * Maps GitHub issue states to ClickUp task statuses
 */
const GITHUB_TO_CLICKUP_STATUS: Record<string, string> = {
  'open': 'to do',
  'closed': 'complete'
};

/**
 * Maps ClickUp task statuses to GitHub issue states
 */
const CLICKUP_TO_GITHUB_STATUS: Record<string, 'open' | 'closed'> = {
  'to do': 'open',
  'in progress': 'open',
  'complete': 'closed',
  'closed': 'closed'
};

/**
 * Syncs a status change from GitHub to ClickUp
 * @param githubIssueId - The GitHub issue ID (number as string)
 * @param githubStatus - The new GitHub issue state ('open' or 'closed')
 * @param eventTimestamp - Optional timestamp of the event for conflict resolution
 * @returns true if sync was successful, false if no mapping exists or sync was skipped
 */
export async function syncStatusToClickUp(
  githubIssueId: string,
  githubStatus: 'open' | 'closed',
  eventTimestamp?: number
): Promise<boolean> {
  try {
    // Look up the ClickUp task ID from storage
    const mapping = getMapping(githubIssueId);
    if (!mapping) {
      return false;
    }

    // Check if this event is older than the last sync (conflict resolution)
    if (eventTimestamp && eventTimestamp < mapping.lastSyncedAt) {
      return false;
    }

    // Map GitHub status to ClickUp status
    const clickupStatus = GITHUB_TO_CLICKUP_STATUS[githubStatus];
    if (!clickupStatus) {
      throw new Error(`Unknown GitHub status: ${githubStatus}`);
    }

    // Update the ClickUp task status
    await updateTaskStatus(mapping.clickupTaskId, clickupStatus);

    // Update the sync timestamp
    updateSyncTimestamp(githubIssueId);

    return true;
  } catch (error) {
    throw new Error('Failed to sync status to ClickUp');
  }
}

/**
 * Syncs a status change from ClickUp to GitHub
 * @param clickupTaskId - The ClickUp task ID
 * @param clickupStatus - The new ClickUp task status
 * @param eventTimestamp - Optional timestamp of the event for conflict resolution
 * @returns true if sync was successful, false if no mapping exists or sync was skipped
 */
export async function syncStatusToGitHub(
  clickupTaskId: string,
  clickupStatus: string,
  eventTimestamp?: number
): Promise<boolean> {
  try {
    // Look up the GitHub issue ID from storage
    const mapping = getMappingByClickUpId(clickupTaskId);
    if (!mapping) {
      return false;
    }

    // Check if this event is older than the last sync (conflict resolution)
    if (eventTimestamp && eventTimestamp < mapping.lastSyncedAt) {
      return false;
    }

    // Map ClickUp status to GitHub state (normalize to lowercase for mapping)
    const normalizedStatus = clickupStatus.toLowerCase();
    const githubState = CLICKUP_TO_GITHUB_STATUS[normalizedStatus];
    if (!githubState) {
      // Default to 'open' for unknown statuses
      await updateIssueStatus(parseInt(mapping.githubIssueId), 'open');
    } else {
      await updateIssueStatus(parseInt(mapping.githubIssueId), githubState);
    }

    // Update the sync timestamp
    updateSyncTimestamp(mapping.githubIssueId);

    return true;
  } catch (error) {
    throw new Error('Failed to sync status to GitHub');
  }
}

/**
 * Syncs a comment from GitHub to ClickUp
 * @param githubIssueId - The GitHub issue ID (number as string)
 * @param commentBody - The comment text
 * @param commentAuthor - The GitHub username of the comment author
 * @param eventTimestamp - Optional timestamp of the event for conflict resolution
 * @returns true if sync was successful, false if no mapping exists or sync was skipped
 */
export async function syncCommentToClickUp(
  githubIssueId: string,
  commentBody: string,
  commentAuthor: string,
  eventTimestamp?: number
): Promise<boolean> {
  try {
    // Look up the ClickUp task ID from storage
    const mapping = getMapping(githubIssueId);
    if (!mapping) {
      return false;
    }

    // Check if this event is older than the last sync (conflict resolution)
    if (eventTimestamp && eventTimestamp < mapping.lastSyncedAt) {
      return false;
    }

    // Format the comment to indicate it came from GitHub
    const formattedComment = `**From GitHub (@${commentAuthor}):**\n\n${commentBody}`;

    // Add comment to ClickUp task
    await addCommentToTask(mapping.clickupTaskId, formattedComment);

    // Update the sync timestamp
    updateSyncTimestamp(githubIssueId);

    return true;
  } catch (error) {
    throw new Error('Failed to sync comment to ClickUp');
  }
}

/**
 * Syncs a comment from ClickUp to GitHub
 * @param clickupTaskId - The ClickUp task ID
 * @param commentBody - The comment text
 * @param commentAuthor - The ClickUp username of the comment author
 * @param eventTimestamp - Optional timestamp of the event for conflict resolution
 * @returns true if sync was successful, false if no mapping exists or sync was skipped
 */
export async function syncCommentToGitHub(
  clickupTaskId: string,
  commentBody: string,
  commentAuthor: string,
  eventTimestamp?: number
): Promise<boolean> {
  try {
    // Look up the GitHub issue ID from storage
    const mapping = getMappingByClickUpId(clickupTaskId);
    if (!mapping) {
      return false;
    }

    // Check if this event is older than the last sync (conflict resolution)
    if (eventTimestamp && eventTimestamp < mapping.lastSyncedAt) {
      return false;
    }

    // Format the comment to indicate it came from ClickUp
    const formattedComment = `**From ClickUp (@${commentAuthor}):**\n\n${commentBody}`;

    // Add comment to GitHub issue
    await addCommentToIssue(parseInt(mapping.githubIssueId), formattedComment);

    // Update the sync timestamp
    updateSyncTimestamp(mapping.githubIssueId);

    return true;
  } catch (error) {
    throw new Error('Failed to sync comment to GitHub');
  }
}

/**
 * Syncs labels from GitHub to ClickUp tags
 * @param githubIssueId - The GitHub issue ID (number as string)
 * @param labels - Array of label names from GitHub
 * @param eventTimestamp - Optional timestamp of the event for conflict resolution
 * @returns true if sync was successful, false if no mapping exists or sync was skipped
 */
export async function syncLabelsToClickUp(
  githubIssueId: string,
  labels: string[],
  eventTimestamp?: number
): Promise<boolean> {
  try {
    // Look up the ClickUp task ID from storage
    const mapping = getMapping(githubIssueId);
    if (!mapping) {
      return false;
    }

    // Check if this event is older than the last sync (conflict resolution)
    if (eventTimestamp && eventTimestamp < mapping.lastSyncedAt) {
      return false;
    }

    // Update ClickUp task tags
    await updateTaskTags(mapping.clickupTaskId, labels);

    // Update the sync timestamp
    updateSyncTimestamp(githubIssueId);

    return true;
  } catch (error) {
    throw new Error('Failed to sync labels to ClickUp');
  }
}

/**
 * Syncs tags from ClickUp to GitHub labels
 * @param clickupTaskId - The ClickUp task ID
 * @param tags - Array of tag names from ClickUp
 * @param eventTimestamp - Optional timestamp of the event for conflict resolution
 * @returns true if sync was successful, false if no mapping exists or sync was skipped
 */
export async function syncLabelsToGitHub(
  clickupTaskId: string,
  tags: string[],
  eventTimestamp?: number
): Promise<boolean> {
  try {
    // Look up the GitHub issue ID from storage
    const mapping = getMappingByClickUpId(clickupTaskId);
    if (!mapping) {
      return false;
    }

    // Check if this event is older than the last sync (conflict resolution)
    if (eventTimestamp && eventTimestamp < mapping.lastSyncedAt) {
      return false;
    }

    // Update GitHub issue labels
    await updateIssueLabels(parseInt(mapping.githubIssueId), tags);

    // Update the sync timestamp
    updateSyncTimestamp(mapping.githubIssueId);

    return true;
  } catch (error) {
    throw new Error('Failed to sync labels to GitHub');
  }
}
