# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Carespace Bug Tracker - An automated bug tracking system that collects customer bug reports, enhances them with AI (Claude), and automatically creates GitHub issues and ClickUp tasks.

**Tech Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS, Anthropic Claude API, GitHub API, ClickUp API

## Essential Commands

### Development
```bash
npm run dev              # Start development server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Testing
```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Test Specific Files
```bash
npm test lib/rate-limiter.test.ts                    # Single test file
npm test -- --testNamePattern="should validate"      # Specific test pattern
```

## Chrome Extension

A Chrome extension is available in the `chrome-extension/` folder that integrates with the bug tracker API.

**Features:**
- Click extension icon or right-click to report bugs
- Auto-capture screenshots of current page
- Pre-fill page context (URL, title, selected text)
- Full integration with AI enhancement pipeline

**Setup:**
```bash
# 1. Load extension in Chrome
# - Go to chrome://extensions/
# - Enable "Developer mode"
# - Click "Load unpacked"
# - Select the chrome-extension/ folder

# 2. Extension uses API at localhost:3000 by default
# For production, edit chrome-extension/popup.js line 2
```

**See `chrome-extension/README.md` for full documentation.**

## Architecture Overview

### Request Flow
1. **User submits bug** → `app/page.tsx` (web form) OR `chrome-extension/popup.html` (extension) → `POST /api/submit-bug`
2. **CORS handling** → `middleware.ts` (allows chrome-extension:// origins)
3. **Rate limiting** → `lib/rate-limiter.ts` (5 req/15min per IP, in-memory)
4. **Validation** → `lib/validation/bug-report-schema.ts` (Zod schema)
5. **File uploads** → `lib/github-service.ts` uploads to GitHub repo (attachments stored in `carespace-bug-tracker`)
6. **AI Enhancement** → `lib/llm-service.ts` (Claude 3.5 Sonnet)
   - Enhances description with technical context
   - Generates suggested labels
   - Creates Claude Code prompt for developers
   - Assigns priority score
   - **Determines target repository** (frontend vs backend)
7. **Parallel Creation** → GitHub issue (routed to correct repo) + ClickUp task created simultaneously
8. **Response** → Returns links to both created items

### Key Service Pattern

Services use a **circuit breaker pattern** (`lib/circuit-breaker.ts`) to prevent cascade failures:
- **CLOSED**: Normal operation
- **OPEN**: Service down, fail fast (60s timeout)
- **HALF_OPEN**: Testing recovery (needs 2 successes to fully close)

All services also implement **exponential backoff retry** (`lib/retry-handler.ts`):
- 3 retry attempts
- Delays: 1s, 2s, 4s
- Used by GitHub, ClickUp, and AI services

### Error Handling & Queue System

When external services fail, `lib/submission-queue.ts` stores failed submissions:
- In-memory Map storage (MVP - should upgrade to Redis for production)
- Tracks partial successes (e.g., GitHub succeeded but ClickUp failed)
- Supports manual retry via `/api/retry-submissions`
- Auto-cleanup after 24 hours

### Intelligent Repository Routing

The system uses AI to automatically route bug reports to the correct repository:

**How it works**:
1. Claude analyzes bug description, category, and technical context
2. Determines if issue is `frontend` or `backend` related
3. Creates GitHub issue in the appropriate repository

**Routing logic**:
- **Frontend repos**: UI/UX issues, rendering, client-side validation, styling, browser bugs, React components
- **Backend repos**: API errors, database issues, server logic, authentication, data processing

**Fallback mechanism** (if AI determination fails):
- `ui` → frontend
- `functionality` → frontend (most user-facing issues)
- `security` → backend
- `performance` → backend
- `other` → frontend (default)

**Configuration**: Set in `.env.local`:
```bash
GITHUB_REPO_FRONTEND=carespace-frontend
GITHUB_REPO_BACKEND=carespace-backend
GITHUB_REPO=carespace-bug-tracker  # Used for attachments storage
```

### Type System

Central types in `lib/types.ts`:
- `BugReport` - Raw user input
- `EnhancedBugReport` - After AI enhancement (extends BugReport, includes `targetRepo`)
- `QueuedSubmission` - Failed submission tracking
- `SyncMapping` - GitHub↔ClickUp mapping (for disabled sync feature)
- AI settings types (`ClaudePromptStyle`, `AIEnhancementSettings`, etc.)

## Disabled Features (`.disabled` files)

The following features are **temporarily disabled** due to incomplete implementations:

### Webhook System (Two-Way Sync)
**Status**: Implementation incomplete, endpoints disabled
- `app/api/webhooks/github/route.ts.disabled` - GitHub webhook endpoint
- `app/api/webhooks/clickup/route.ts.disabled` - ClickUp webhook endpoint
- `lib/sync-service.ts.disabled` - Bidirectional sync logic
- `lib/sync-storage.ts` - In-memory sync mapping (active, but unused)

**To Re-enable**:
1. Implement missing export functions in `lib/github-service.ts` and `lib/clickup-service.ts`
2. Test sync logic thoroughly
3. Rename `.disabled` files back to `.ts`
4. See `WEBHOOK_SETUP.md` for configuration guide

### Duplicate Detection (AI-powered)
**Status**: Implementation incomplete, endpoints disabled
- `app/api/search-duplicates/route.ts.disabled` - Search similar bugs
- `app/api/confirm-duplicate/route.ts.disabled` - User confirmation
- `lib/duplicate-detection-service.ts.disabled` - AI semantic similarity

**To Re-enable**:
1. Implement missing exports: `listOpenIssues()`, `getIssueByNumber()`, `storeUserConfirmation()`
2. Add frontend UI for duplicate detection workflow
3. Rename `.disabled` files back to `.ts`

### Admin Settings Page
**Status**: Incomplete feature, page disabled
- `app/admin/page.tsx.disabled` - AI enhancement settings UI
- `app/api/ai-settings/route.ts.disabled` - Settings persistence API

**To Re-enable**:
1. Complete admin UI implementation
2. Add authentication/authorization
3. Rename `.disabled` files back to `.ts`

### Auto-Assignment
**Status**: Config-based system exists but not fully integrated
- `lib/assignment-service.ts` - Category-based + AI-powered assignment
- `lib/assignment-config.json` - Team/category mappings
- Not currently called by main submission flow

**To Integrate**:
1. Import and call `determineAssignees()` in `/api/submit-bug/route.ts`
2. Pass returned assignees to `createGitHubIssue()` and `createClickUpTask()`

## Important Implementation Details

### Rate Limiting (In-Memory Warning)
`lib/rate-limiter.ts` uses **in-memory Map** storage. This has limitations:
- **Serverless environments**: Each instance has separate state (ineffective in auto-scaling)
- **Deployments**: Counters reset on restart/redeploy
- **Production**: Should migrate to Redis (Vercel KV or Upstash) for shared state

### Prompt Sanitization
`lib/prompt-sanitizer.ts` sanitizes user input before sending to Claude:
- Removes prompt injection attempts
- Redacts sensitive data (emails via `lib/utils/redact-email.ts`)
- Validates against malicious patterns
- **Critical**: Always sanitize before AI API calls

### Form Validation
Client-side (`lib/hooks/useFieldValidation.ts`) + Server-side (`lib/validation/bug-report-schema.ts`):
- Real-time validation as user types
- Visual feedback (red borders, error messages)
- Server validates with Zod schema before processing
- Email validation is optional (can be anonymous)

### Browser Detection
`lib/browser-detection.ts` auto-detects user's browser info if not provided manually.

### File Upload Flow
1. Client sends FormData with file attachments
2. `/api/submit-bug/route.ts` extracts files from FormData
3. `uploadFilesToGitHub()` uploads to repo at `bug-attachments/{timestamp}-{filename}`
4. Returns raw GitHub URLs for each file
5. URLs embedded in GitHub issue body as markdown links
6. Files sent to ClickUp as actual attachments (different API)

## Testing Patterns

### Unit Tests
Located alongside source files (e.g., `lib/rate-limiter.test.ts`)

```typescript
// Mock external services in __mocks__/ directory
jest.mock('@/lib/github-service');
jest.mock('@/lib/clickup-service');
```

### Integration Tests
`lib/__tests__/error-handling-integration.test.ts` tests multi-service failure scenarios.

### E2E Tests (for sync feature when re-enabled)
Located in `scripts/`:
- `e2e-test-github-to-clickup.ts`
- `e2e-test-clickup-to-github.ts`
- `e2e-test-label-sync.ts`

## Environment Variables

Required in `.env.local`:
```bash
# Core Services
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=carespace-ai
GITHUB_REPO=carespace-bug-tracker
CLICKUP_API_KEY=pk_...
CLICKUP_LIST_ID=...

# Webhook Secrets (if re-enabling sync)
GITHUB_WEBHOOK_SECRET=...
CLICKUP_WEBHOOK_SECRET=...
```

## Common Debugging Scenarios

### Build Failures
**Check for missing type exports**: All types must be in `lib/types.ts` or imported correctly. Recent fixes added:
- `ClaudePromptStyle`, `AIEnhancementSettings`, `QueuedSubmission`, `SyncMapping`

**Disabled features**: Files ending in `.disabled` are intentionally excluded from builds.

### Rate Limit Not Working
In serverless (Vercel), rate limiter is per-instance. For true rate limiting, migrate to Redis.

### AI Responses Failing
1. Check API key validity and credits
2. Verify `lib/prompt-sanitizer.ts` isn't over-sanitizing input
3. Check circuit breaker state: `getCircuitStatus('anthropic')`
4. Review timeout settings in `lib/llm-service.ts` (60s default)

### Failed Submissions Queue
View queued items (in current instance memory): Check `/api/retry-submissions` endpoint
Clear queue: Restart server (in-memory storage)

## Code Style Guidelines

- **TypeScript**: Strict mode enabled, avoid `any` types
- **Async/Await**: Prefer over `.then()` chains
- **Error Handling**: Always wrap external API calls in try-catch with circuit breaker
- **Validation**: Use Zod schemas for all external input
- **Comments**: JSDoc for public functions, inline for complex logic
- **File Uploads**: Always handle FormData correctly (not JSON)

## Production Deployment Notes

1. **Vercel Recommended**: Optimized for Next.js serverless
2. **Environment Variables**: Set all required vars in Vercel dashboard
3. **Upgrade Path for Scale**:
   - Rate limiter: Migrate to Vercel KV or Upstash Redis
   - Submission queue: Migrate to Redis/database
   - Sync storage: Migrate to Vercel KV when re-enabling webhooks
4. **Monitor**: API usage (Anthropic costs), rate limit effectiveness
5. **Security**: Never commit `.env.local`, rotate API keys regularly
