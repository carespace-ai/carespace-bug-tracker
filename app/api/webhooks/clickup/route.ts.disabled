import { NextRequest, NextResponse } from 'next/server';
import { verifyClickUpSignature } from '@/lib/webhook-validator';
import { syncStatusToGitHub, syncCommentToGitHub, syncLabelsToGitHub } from '@/lib/sync-service';
import { getTask } from '@/lib/clickup-service';
import { ClickUpWebhookEvent } from '@/lib/types';

/**
 * ClickUp webhook endpoint
 * Handles events: taskStatusUpdated, taskTagsUpdated, taskCommentPosted
 * Verifies webhook signature and syncs changes to GitHub
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const body = await request.text();

    // Get signature from header
    const signature = request.headers.get('x-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      );
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.CLICKUP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const isValid = verifyClickUpSignature(body, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const payload: ClickUpWebhookEvent = JSON.parse(body);

    // Get task ID from payload
    const taskId = payload.task_id;
    if (!taskId) {
      return NextResponse.json(
        { error: 'No task ID in payload' },
        { status: 400 }
      );
    }

    // Get event type from payload
    const eventType = payload.event;

    // Use current timestamp for event ordering
    const eventTimestamp = Date.now();

    // Handle different event types
    let syncResult = false;

    if (eventType === 'taskStatusUpdated') {
      // Handle status change
      // Extract the new status from history_items
      const statusChange = payload.history_items?.find(item => item.field === 'status');
      if (statusChange && statusChange.after) {
        const newStatus = statusChange.after;
        syncResult = await syncStatusToGitHub(taskId, newStatus, eventTimestamp);
      }
    } else if (eventType === 'taskTagsUpdated') {
      // Handle tags change - fetch current task state to get all tags
      const taskData = await getTask(taskId);
      const tags = taskData.tags.map((tag: { name: string }) => tag.name);
      syncResult = await syncLabelsToGitHub(taskId, tags, eventTimestamp);
    } else if (eventType === 'taskCommentPosted') {
      // Handle new comment
      const commentBody = payload.comment?.comment_text;
      const commentAuthor = payload.comment?.user?.username;

      if (commentBody && commentAuthor) {
        syncResult = await syncCommentToGitHub(
          taskId,
          commentBody,
          commentAuthor,
          eventTimestamp
        );
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      synced: syncResult,
      message: syncResult
        ? 'Event processed and synced to GitHub'
        : 'Event processed but not synced (no mapping found or outdated event)'
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
