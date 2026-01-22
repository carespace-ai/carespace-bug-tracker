import { SyncMapping } from './types';

// In-memory storage for MVP
// TODO: Migrate to Vercel KV for production to support multi-instance deployments
const syncMappings = new Map<string, SyncMapping>();

/**
 * Generates a composite key for the mapping storage
 * Uses githubIssueId as the primary key
 */
function generateKey(githubIssueId: string): string {
  return `github:${githubIssueId}`;
}

/**
 * Stores a mapping between a GitHub issue and a ClickUp task
 *
 * @param githubIssueId - The GitHub issue ID or number
 * @param clickupTaskId - The ClickUp task ID
 * @param syncDirection - The direction of sync ('github_to_clickup', 'clickup_to_github', or 'bidirectional')
 * @returns The stored SyncMapping object
 */
export function setMapping(
  githubIssueId: string,
  clickupTaskId: string,
  syncDirection: SyncMapping['syncDirection'] = 'bidirectional'
): SyncMapping {
  const mapping: SyncMapping = {
    githubIssueId,
    clickupTaskId,
    lastSyncedAt: Date.now(),
    syncDirection
  };

  const key = generateKey(githubIssueId);
  syncMappings.set(key, mapping);

  return mapping;
}

/**
 * Retrieves a mapping by GitHub issue ID
 *
 * @param githubIssueId - The GitHub issue ID to look up
 * @returns The SyncMapping if found, undefined otherwise
 */
export function getMapping(githubIssueId: string): SyncMapping | undefined {
  const key = generateKey(githubIssueId);
  return syncMappings.get(key);
}

/**
 * Retrieves a mapping by ClickUp task ID
 * Note: This performs a linear search through all mappings
 *
 * @param clickupTaskId - The ClickUp task ID to look up
 * @returns The SyncMapping if found, undefined otherwise
 */
export function getMappingByClickUpId(clickupTaskId: string): SyncMapping | undefined {
  const mappings = Array.from(syncMappings.values());
  for (const mapping of mappings) {
    if (mapping.clickupTaskId === clickupTaskId) {
      return mapping;
    }
  }
  return undefined;
}

/**
 * Updates the lastSyncedAt timestamp for a mapping
 *
 * @param githubIssueId - The GitHub issue ID
 * @returns true if the mapping was updated, false if not found
 */
export function updateSyncTimestamp(githubIssueId: string): boolean {
  const mapping = getMapping(githubIssueId);
  if (!mapping) {
    return false;
  }

  mapping.lastSyncedAt = Date.now();
  const key = generateKey(githubIssueId);
  syncMappings.set(key, mapping);

  return true;
}

/**
 * Deletes a mapping by GitHub issue ID
 *
 * @param githubIssueId - The GitHub issue ID
 * @returns true if the mapping was deleted, false if not found
 */
export function deleteMapping(githubIssueId: string): boolean {
  const key = generateKey(githubIssueId);
  return syncMappings.delete(key);
}

/**
 * Retrieves all stored mappings
 *
 * @returns Array of all SyncMapping objects
 */
export function getAllMappings(): SyncMapping[] {
  return Array.from(syncMappings.values());
}

/**
 * Clears all mappings from storage
 * Useful for testing and cleanup
 */
export function clearAllMappings(): void {
  syncMappings.clear();
}
