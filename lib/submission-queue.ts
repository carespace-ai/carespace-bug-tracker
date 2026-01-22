/**
 * Submission queue for managing failed bug report submissions
 * Stores failed submissions for retry with metadata tracking
 */

import { BugReport, EnhancedBugReport, QueuedSubmission } from './types';

// Configuration constants
const MAX_QUEUE_SIZE = 1000; // Maximum number of submissions to queue
const MAX_RETRY_COUNT = 3; // Maximum number of retry attempts
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up every 5 minutes
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // Remove submissions older than 24 hours

// In-memory storage
const submissionQueue = new Map<string, QueuedSubmission>();
let lastGlobalCleanup = Date.now();

/**
 * Generates a unique ID for a submission
 */
function generateSubmissionId(): string {
  return `submission-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Performs global cleanup of old and completed entries
 * Removes submissions that are too old or have exceeded retry count
 */
function performGlobalCleanup(): void {
  const now = Date.now();

  // Only run global cleanup every CLEANUP_INTERVAL_MS
  if (now - lastGlobalCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  const cutoff = now - MAX_AGE_MS;

  for (const [id, submission] of submissionQueue.entries()) {
    // Remove old submissions
    if (submission.timestamp < cutoff) {
      submissionQueue.delete(id);
      continue;
    }

    // Remove submissions that have exceeded retry count and are marked as failed
    if (submission.status === 'failed' && submission.retryCount >= MAX_RETRY_COUNT) {
      submissionQueue.delete(id);
    }
  }

  lastGlobalCleanup = now;
}

/**
 * Adds a failed submission to the queue
 *
 * @param bugReport - The original bug report
 * @param enhancedReport - Optional enhanced bug report from AI
 * @param errors - Object containing error messages for each service
 * @param successfulServices - Object indicating which services succeeded
 * @param urls - Optional URLs from successful service submissions
 * @returns The ID of the queued submission
 */
export function addToQueue(
  bugReport: BugReport,
  enhancedReport: EnhancedBugReport | undefined,
  errors: { github?: string; clickup?: string; anthropic?: string },
  successfulServices: { github?: boolean; clickup?: boolean; anthropic?: boolean },
  urls?: { github?: string; clickup?: string }
): string {
  // Perform cleanup periodically
  performGlobalCleanup();

  // Check if queue is full
  if (submissionQueue.size >= MAX_QUEUE_SIZE) {
    throw new Error('Submission queue is full. Cannot add more submissions.');
  }

  const id = generateSubmissionId();
  const now = Date.now();

  // Determine status based on successes
  let status: 'pending' | 'retrying' | 'failed' | 'partial' = 'pending';
  const hasAnySuccess = Object.values(successfulServices).some(Boolean);
  const hasAnyFailure = Object.keys(errors).length > 0;

  if (hasAnySuccess && hasAnyFailure) {
    status = 'partial';
  } else if (hasAnyFailure) {
    status = 'pending';
  }

  const submission: QueuedSubmission = {
    id,
    bugReport,
    enhancedReport,
    status,
    retryCount: 0,
    timestamp: now,
    errors,
    successfulServices,
    urls
  };

  submissionQueue.set(id, submission);

  return id;
}

/**
 * Gets a queued submission by ID
 *
 * @param id - The submission ID
 * @returns The queued submission or undefined if not found
 */
export function getQueuedSubmission(id: string): QueuedSubmission | undefined {
  return submissionQueue.get(id);
}

/**
 * Gets all queued submissions
 *
 * @param statusFilter - Optional filter by status
 * @returns Array of queued submissions
 */
export function getAllQueuedSubmissions(
  statusFilter?: 'pending' | 'retrying' | 'failed' | 'partial'
): QueuedSubmission[] {
  performGlobalCleanup();

  const submissions = Array.from(submissionQueue.values());

  if (statusFilter) {
    return submissions.filter(s => s.status === statusFilter);
  }

  return submissions;
}

/**
 * Gets submissions that are ready for retry
 * Returns submissions that are pending or partial and haven't exceeded retry count
 *
 * @returns Array of submissions ready for retry
 */
export function getRetryableSubmissions(): QueuedSubmission[] {
  performGlobalCleanup();

  return Array.from(submissionQueue.values()).filter(
    s =>
      (s.status === 'pending' || s.status === 'partial') &&
      s.retryCount < MAX_RETRY_COUNT
  );
}

/**
 * Updates a submission's status and retry information
 *
 * @param id - The submission ID
 * @param updates - Partial updates to apply
 * @returns true if updated, false if submission not found
 */
export function updateSubmission(
  id: string,
  updates: {
    status?: 'pending' | 'retrying' | 'failed' | 'partial';
    retryCount?: number;
    lastAttempt?: number;
    errors?: { github?: string; clickup?: string; anthropic?: string };
    successfulServices?: { github?: boolean; clickup?: boolean; anthropic?: boolean };
    urls?: { github?: string; clickup?: string };
  }
): boolean {
  const submission = submissionQueue.get(id);

  if (!submission) {
    return false;
  }

  // Apply updates
  if (updates.status !== undefined) {
    submission.status = updates.status;
  }
  if (updates.retryCount !== undefined) {
    submission.retryCount = updates.retryCount;
  }
  if (updates.lastAttempt !== undefined) {
    submission.lastAttempt = updates.lastAttempt;
  }
  if (updates.errors) {
    submission.errors = { ...submission.errors, ...updates.errors };
  }
  if (updates.successfulServices) {
    submission.successfulServices = {
      ...submission.successfulServices,
      ...updates.successfulServices
    };
  }
  if (updates.urls) {
    submission.urls = {
      ...submission.urls,
      ...updates.urls
    };
  }

  submissionQueue.set(id, submission);
  return true;
}

/**
 * Increments the retry count for a submission and updates status to 'retrying'
 *
 * @param id - The submission ID
 * @returns true if updated, false if submission not found or max retries exceeded
 */
export function incrementRetryCount(id: string): boolean {
  const submission = submissionQueue.get(id);

  if (!submission) {
    return false;
  }

  if (submission.retryCount >= MAX_RETRY_COUNT) {
    // Mark as failed if max retries exceeded
    submission.status = 'failed';
    submissionQueue.set(id, submission);
    return false;
  }

  submission.retryCount++;
  submission.status = 'retrying';
  submission.lastAttempt = Date.now();

  submissionQueue.set(id, submission);
  return true;
}

/**
 * Removes a submission from the queue
 *
 * @param id - The submission ID
 * @returns true if removed, false if not found
 */
export function removeFromQueue(id: string): boolean {
  return submissionQueue.delete(id);
}

/**
 * Gets the current queue size
 *
 * @returns Number of submissions in the queue
 */
export function getQueueSize(): number {
  performGlobalCleanup();
  return submissionQueue.size;
}

/**
 * Clears all submissions from the queue
 * Useful for testing or administrative purposes
 */
export function clearQueue(): void {
  submissionQueue.clear();
  lastGlobalCleanup = Date.now();
}

/**
 * Gets queue statistics
 *
 * @returns Object with queue statistics
 */
export function getQueueStats(): {
  total: number;
  pending: number;
  retrying: number;
  failed: number;
  partial: number;
  retryable: number;
} {
  performGlobalCleanup();

  const all = Array.from(submissionQueue.values());

  return {
    total: all.length,
    pending: all.filter(s => s.status === 'pending').length,
    retrying: all.filter(s => s.status === 'retrying').length,
    failed: all.filter(s => s.status === 'failed').length,
    partial: all.filter(s => s.status === 'partial').length,
    retryable: all.filter(
      s =>
        (s.status === 'pending' || s.status === 'partial') &&
        s.retryCount < MAX_RETRY_COUNT
    ).length
  };
}
