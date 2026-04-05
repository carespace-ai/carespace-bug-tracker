# Pipeline Run

## Task
Investigate GitHub issue creation failure, add debug logging, remove ClickUp integration (carespace-ai/carespace-bug-tracker#1)

## Type
bug-fix

## Status
COMPLETE

## Investigation

### Root Causes Found
1. **Error swallowing in github-service.ts**: The catch block threw generic "Failed to create GitHub issue" messages, discarding Octokit API error details (HTTP status, error message, validation errors)
2. **No env var validation**: `GITHUB_OWNER` and `GITHUB_TOKEN` were silently empty strings — API calls would fail with cryptic 404 errors
3. **No targetRepo validation**: If AI returned an invalid value, `REPOS[targetRepo]` would be `undefined`, causing silent failures
4. **Sequential ClickUp dependency**: In route.ts, if ClickUp creation failed after GitHub succeeded, the entire request failed and the successful GitHub issue was lost
5. **No correlation IDs**: Impossible to trace a request across LLM, upload, and GitHub services

### Files Affected
- `lib/github-service.ts` — error handling, validation, logging
- `app/api/submit-bug/route.ts` — ClickUp removal, correlation IDs, structured logging
- `app/api/retry-submissions/route.ts` — ClickUp removal, logging
- `lib/types.ts` — removed ClickUp types
- `lib/clickup-service.ts` — deleted
- `lib/sync-storage.ts` — deleted (GitHub-to-ClickUp mapping)
- `lib/webhook-validator.ts` — removed ClickUp signature verification
- UI components, translations, CSP config — removed ClickUp references

## Build
- Created `lib/logger.ts` with structured JSON logging, correlation IDs, and timing
- Updated `github-service.ts` with `validateGitHubConfig()`, `formatGitHubApiError()`, and structured logging
- Removed all ClickUp integration code (service, types, sync storage, e2e tests, UI, translations)
- Updated CSP headers to remove ClickUp API domain

## Review
- All new code follows existing patterns
- No new dependencies added
- Pre-existing test failures unaffected (4 suites with pre-existing issues)
- 6 test suites pass, webhook-validator and other affected tests updated

## Security
- No secrets exposed in logs (IP addresses still only used for rate limiting)
- Removed ClickUp API key dependency (reduced attack surface)
- CSP headers updated to remove unnecessary ClickUp domain
- No new external API calls introduced
