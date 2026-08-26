# lib — Backend Service Layer

> The tracker's business logic: turns a validated `BugReport` into a filed issue, either by handing off to the Paperclip Bug Triage agent (preferred) or by the legacy LLM-enhance → GitHub + ClickUp pipeline, wrapped in resilience (circuit breaker, retry, in-memory queue) and security (prompt sanitization, PII redaction).

## Scope

**Owns**: All server-side integration and orchestration logic — LLM enhancement (`llm-service`), Paperclip handoff (`paperclip-service`), GitHub (`github-service`) and ClickUp (`clickup-service`) clients, Azure Blob upload (`azure-blob-service`), resilience primitives (`circuit-breaker`, `retry-handler`, `submission-queue`), abuse/security controls (`rate-limiter`, `prompt-sanitizer`, `utils/redact-email`), outgoing webhooks (`outgoing-webhook-service`, `webhook-storage`, `webhook-validator`), in-memory GitHub↔ClickUp mapping (`sync-storage`), and the central type system (`types.ts`, `validation/bug-report-schema`).

**Does NOT own**: HTTP request/response handling and route wiring (→ `app/api`), UI/form rendering (→ `app`, `lib/components`, `lib/hooks`, `lib/i18n`), the external Paperclip agent's own behavior (remote service on `office.carespace.ai`).

## Dependencies

### This System Depends On

| System | What's Used | Contract |
|--------|-------------|----------|
| (external) Anthropic Claude API | `@anthropic-ai/sdk` in `llm-service` | Async; 60s timeout; guarded by circuit breaker + retry |
| (external) GitHub API | `@octokit/rest` in `github-service` | Async; routed to frontend/backend repo by `targetRepo` |
| (external) ClickUp API | `axios` in `clickup-service` | Async; task create + file attach |
| (external) Azure Blob Storage | `@azure/storage-blob` in `azure-blob-service` | Uploads to `bug-attachments` container; returns public URLs |
| (external) Paperclip / office.carespace.ai | `fetch` in `paperclip-service` | Async; issue create + agent wakeup; 15s/10s timeouts |
| `validation/bug-report-schema` | `bugReportSchema` (Zod) | Sync parse of untrusted input |
| `types.ts` | Domain types | Shared across all services |

### Systems That Depend On This

| System | How It's Used |
|--------|---------------|
| `app/api/submit-bug` | Full pipeline: upload → paperclip OR enhance+github+clickup+webhooks |
| `app/api/retry-submissions` | Drains `submission-queue`, retries github/clickup |
| `app/api/webhooks/{subscribe,unsubscribe}` | Manages webhook subscriptions via `webhook-storage` |
| `app` / `app/hooks` / `app/components` | Client-side helpers (`browser-detection`, `types`, validation) |

## Integration Points

### → Paperclip Bug Triage agent (`paperclip-service`)

**What's passed**: sanitized `BugReport` + uploaded attachment URLs, rendered into a triage prompt POSTed as an "issue" to `/api/companies/{id}/issues`, then a best-effort `/api/agents/{id}/wakeup`.
**Who owns lifecycle**: remote agent files the GitHub issue; the tracker only captures + hands off.
**Contract**: async, 15s create timeout; any throw is caught by the caller and falls through to the legacy path. The prompt embeds an explicit prompt-injection guard treating report content as untrusted data.

### → GitHub + ClickUp (legacy path)

**What's passed**: `EnhancedBugReport` (with `targetRepo`) → `createGitHubIssue`; then GitHub URL → `createClickUpTask`. Mapping stored via `sync-storage.setMapping`, webhooks fired via `outgoing-webhook-service` (fire-and-forget).

## Initialization & Lifecycle

**Created by**: nothing — modules export free functions, not classes. State lives in **module-level Maps** (singletons per server instance).

**Lifecycle**: per-instance singletons. `rate-limiter`, `submission-queue`, `sync-storage`, `webhook-storage`, `circuit-breaker` all hold **in-memory** state that resets on restart/redeploy and is **not shared across serverless instances**.

## State

**Holds**: rate-limit counters (5 req/15min per IP), circuit-breaker states (CLOSED/OPEN/HALF_OPEN, 60s open timeout, 2 successes to close), failed-submission queue (24h auto-cleanup), webhook subscriptions, GitHub↔ClickUp mappings.

**Immutable**: none — all the above Maps are mutable module state.

## Key Invariants

- **Must**: sanitize every user-supplied string through `sanitizeBugReportForPrompt` before it reaches any LLM or the Paperclip prompt.
- **Must**: attachments are uploaded to Azure Blob *once* in the route and their URLs reused by both submission paths — services never re-upload.
- **Never**: log or persist client IP (PII/GDPR); it is used only for in-memory rate limiting.
- **Assumes**: external secrets (`ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `CLICKUP_API_KEY`, `AZURE_STORAGE_CONNECTION_STRING`, `PAPERCLIP_*`) are present in the environment; feature-flag helpers (`paperclipEnabled()`) gate optional paths.
- **Never**: the Paperclip path creates a ClickUp task — that is intentional; ClickUp is legacy-path only.

## Patterns

```ts
// Wrap every external call in the circuit breaker + retry
await executeWithCircuitBreaker('anthropic', () =>
  retryWithBackoff(() => enhanceBugReport(bugReport))
);
```

## Anti-patterns

```ts
// ❌ Don't send raw form text to an LLM/agent — prompt-injection risk
await enhanceBugReport(rawBody);

// ✅ Do sanitize first (the route validates with Zod; services sanitize before prompts)
const clean = sanitizeBugReportForPrompt(bugReport);
```

<!-- Note: several features are shipped-but-disabled (two-way webhook sync, duplicate detection, admin settings, auto-assignment). See root CLAUDE.md "Disabled Features". `assignment-service` and `sync-storage` exist but are not wired into the main flow. -->
