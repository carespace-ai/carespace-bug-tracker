import { NextRequest, NextResponse } from 'next/server';
import { verifyGitHubSignature } from '@/lib/webhook-validator';
import { syncStatusToClickUp, syncCommentToClickUp, syncLabelsToClickUp } from '@/lib/sync-service';
import { getIssueByNumber } from '@/lib/github-service';
import { GitHubWebhookEvent } from '@/lib/types';

/**
 * GitHub webhook endpoint
 * Handles events: issues.labeled, issues.unlabeled, issues.closed, issues.reopened, issue_comment.created
 * Verifies webhook signature and syncs changes to ClickUp
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const body = await request.text();

    // Get signature from header
    const signature = request.headers.get('x-hub-signature-256');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      );
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const isValid = verifyGitHubSignature(body, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const payload: GitHubWebhookEvent = JSON.parse(body);

    // Get event type from header
    const eventType = request.headers.get('x-github-event');

    // Get issue number from payload
    const issueNumber = payload.issue?.number;
    if (!issueNumber) {
      return NextResponse.json(
        { error: 'No issue number in payload' },
        { status: 400 }
      );
    }

    // Convert issue number to string for storage lookup
    const githubIssueId = issueNumber.toString();

    // Use current timestamp for event ordering
    const eventTimestamp = Date.now();

    // Handle different event types
    let syncResult = false;

    if (eventType === 'issues') {
      // Handle issue events (closed, reopened, labeled, unlabeled)
      if (payload.action === 'closed' || payload.action === 'reopened') {
        // Sync status change
        const status = payload.action === 'closed' ? 'closed' : 'open';
        syncResult = await syncStatusToClickUp(githubIssueId, status, eventTimestamp);
      } else if (payload.action === 'labeled' || payload.action === 'unlabeled') {
        // Fetch current issue state to get all labels
        const issueData = await getIssueByNumber(issueNumber);
        syncResult = await syncLabelsToClickUp(githubIssueId, issueData.labels, eventTimestamp);
      }
    } else if (eventType === 'issue_comment' && payload.action === 'created') {
      // Handle new comment
      const commentBody = payload.comment?.body;
      const commentAuthor = payload.comment?.user?.login;

      if (commentBody && commentAuthor) {
        syncResult = await syncCommentToClickUp(
          githubIssueId,
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
        ? 'Event processed and synced to ClickUp'
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
