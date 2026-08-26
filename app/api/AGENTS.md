# app/api — HTTP Route Handlers

> Next.js App Router endpoints that receive external input (web form + Chrome extension), enforce rate limits and validation, and drive the `lib` service layer. The routes hold no business logic themselves — they orchestrate `lib`.

## Scope

**Owns**: Request parsing, input/attachment validation, rate-limit enforcement, admin auth, and response shaping for four active endpoints:
- `POST /api/submit-bug` — the main intake pipeline.
- `POST /api/retry-submissions` — admin-only drain of the failed-submission queue.
- `POST /api/webhooks/subscribe` / `DELETE /api/webhooks/unsubscribe` — outgoing-webhook subscription management.

**Does NOT own**: business logic, external API calls, or persistence (all delegated to `lib`); CORS + correlation-ID injection (handled by root `middleware.ts` for all `/api/*`); disabled endpoints (`webhooks/github`, `webhooks/clickup`, `search-duplicates`, `confirm-duplicate`, `ai-settings` — shipped as `.disabled`).

## Dependencies

### This System Depends On

| System | What's Used | Contract |
|--------|-------------|----------|
| `lib` (services) | `paperclipEnabled`/`submitToPaperclip`, `enhanceBugReport`, `createGitHubIssue`, `createClickUpTask`, `uploadFilesToAzureBlob`, `getRateLimitResult`, `setMapping`, `deliverWebhookToSubscribers`, queue fns | Async; see `lib/AGENTS.md` |
| `lib/validation/bug-report-schema` | `bugReportSchema.safeParse` | Sync; rejects invalid input with 400 |
| `middleware.ts` (root) | CORS + `X-Request-ID` correlation id | Applied to all `/api/*` |

### Systems That Depend On This

| System | How It's Used |
|--------|---------------|
| `app` web form (`useBugReportForm`) | POSTs multipart FormData to `/api/submit-bug` |
| `chrome-extension` (`popup.js`) | POSTs to `/api/submit-bug` (prod/dev URL from `config.js`) |
| External webhook subscribers | Register via `/api/webhooks/*` |

## Integration Points

### ← Clients (web form + extension)

**What's received**: `multipart/form-data` — bug fields + up to 5 file attachments (≤10MB each; images/video/pdf/txt/json by MIME or extension, with `application/octet-stream` fallback).
**Expectations**: callers get rate-limit headers (`X-RateLimit-*`) on every response and a `429` with `Retry-After` when throttled.

### → `submit-bug` two-path flow

1. Rate-limit (`getClientIP` → `getRateLimitResult`) → 429 if exceeded.
2. Parse FormData, validate files, `bugReportSchema.safeParse` → 400 on failure.
3. Upload valid attachments to Azure Blob **once** (URLs shared by both paths).
4. **If `paperclipEnabled()`**: `submitToPaperclip` and return `{ paperclipIssue }`; on any throw, fall through.
5. **Legacy fallback**: `enhanceBugReport` → `createGitHubIssue` → `createClickUpTask` → `setMapping` → fire-and-forget `deliverWebhookToSubscribers`.

## State

**Holds**: Stateless per request — all durable-ish state lives in `lib` module singletons.

## Key Invariants

- **Must**: check the rate limiter *before* the try-block so limit headers are attached to every response, including errors.
- **Must**: never place the client IP in logs, error bodies, or external payloads (GDPR — see the `getClientIP` docstring).
- **Never**: let a Paperclip failure lose a report — it is caught and the legacy path runs.
- **Assumes**: `retry-submissions` is protected by `x-admin-api-key` matching `ADMIN_API_KEY`; if `ADMIN_API_KEY` is unset, access is allowed (dev-only convenience — set it in production).

## Patterns

```ts
// Rate-limit outside the try block so headers reach error responses too
const rateLimitResult = getRateLimitResult(getClientIP(request));
if (!rateLimitResult.allowed) return NextResponse.json({ error: 'Rate limit exceeded' },
  { status: 429, headers: { ...getRateLimitHeaders(rateLimitResult), 'Retry-After': '...' } });
```

## Anti-patterns

```ts
// ❌ Don't parse as JSON — clients send multipart FormData with files
const body = await request.json();

// ✅ Do read FormData and coerce empty strings to undefined
const formData = await request.formData();
```
