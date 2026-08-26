# CareSpace Bug Tracker

> An automated bug-intake system: it captures customer bug reports from a web form and a Chrome extension, then either hands them to the Paperclip Bug Triage agent (preferred) or runs a legacy AI-enhance → GitHub issue + ClickUp task pipeline. Next.js 16 / React 19 / TypeScript on Vercel.

<!-- A hand-authored CLAUDE.md sits alongside this file with commands, env vars,
     disabled-feature notes, and debugging playbooks. This AGENTS.md is the
     hierarchical architecture root; read CLAUDE.md for operational detail. -->

## System Architecture

```
┌──────────────┐        ┌──────────────────┐
│  Web form    │        │ Chrome extension │   clients
│  app/page.tsx│        │ chrome-extension │
└──────┬───────┘        └─────────┬────────┘
       │  POST multipart FormData │
       ▼                          ▼
┌───────────────────────────────────────────┐
│  middleware.ts  (CORS + X-Request-ID)      │
└───────────────────┬───────────────────────┘
                    ▼
┌───────────────────────────────────────────┐
│  app/api  (rate-limit · validate · upload) │
└───────────────────┬───────────────────────┘
                    ▼
┌───────────────────────────────────────────┐
│  lib  (service layer)                      │
│   paperclip? ──yes──▶ Paperclip agent      │
│      │ no / on failure (fallback)          │
│      ▼                                      │
│   llm-service ▶ github-service ▶ clickup    │
└───────────────────┬───────────────────────┘
        external:   ▼
  Anthropic · GitHub · ClickUp · Azure Blob · office.carespace.ai
```

## Data Flow

### Bug submission (primary)

1. **Client** (web form or extension) → `POST /api/submit-bug` with multipart FormData + attachments.
2. `middleware.ts` → CORS + correlation id.
3. `app/api/submit-bug` → per-IP rate limit → Zod validation → attachment upload to Azure Blob (once).
4. **If `PAPERCLIP_ENABLED`** → `submitToPaperclip`: create an issue on `office.carespace.ai` + wake the Bug Triage agent, which clones the repos, dedupes open/closed issues, reproduces in a headless browser, and files the GitHub issue itself. Response returns the Paperclip issue id.
5. **On any Paperclip failure, or when the flag is off** → legacy path: `enhanceBugReport` (Claude) → `createGitHubIssue` (routed frontend/backend) → `createClickUpTask` → store mapping → fire-and-forget outgoing webhooks.

### Retry

Failed legacy submissions land in the in-memory `submission-queue`; `POST /api/retry-submissions` (admin-key gated) re-drives GitHub/ClickUp creation.

## System Boundaries

| Area | Owns | Does NOT Own |
|------|------|--------------|
| `app` (frontend) | Form UX, client validation, result display | Business logic, persistence |
| `app/api` | HTTP intake, rate-limit, validation, orchestration | Enhancement, external calls |
| `lib` | Enhancement, integrations, resilience, security | Rendering, routing |
| `chrome-extension` | In-browser capture + submit | Server processing |

## Dependency Direction

```
app (frontend) ─┐
app/api ────────┼──▶ lib ──▶ (external APIs)
chrome-extension┘        (Anthropic, GitHub, ClickUp, Azure, Paperclip)
```

**Rule**: dependencies point toward `lib`; `lib` never imports `app`. Confirmed by CodeGraph `module_dependencies` (every `app/*` and root edge targets `lib`).

## App Integration

Part of the CareSpace HIPAA healthcare platform, but this repo is an **internal engineering-ops tool**, not a clinical/PHI system:

- **No patient PHI by design.** Inputs are bug reports (title, description, repro steps, environment, optional reporter email, screenshots). The code treats the reporter email and client IP as PII: IP is used only for in-memory rate limiting and is explicitly barred from logs, error bodies, and external payloads (`getClientIP` docstring in `app/api/submit-bug`); emails are redacted before LLM prompts (`lib/utils/redact-email`, `lib/prompt-sanitizer`). *Unverified*: screenshots are user-supplied and could incidentally contain sensitive on-screen data — they are uploaded to a public-URL Azure Blob container (`bug-attachments`) and linked in issues, so treat that container as public.
- **Auth boundary**: the intake endpoint is **unauthenticated** and public (CORS `*`, so the extension works), throttled only by per-IP rate limiting. The only privileged endpoint is `/api/retry-submissions`, gated by `x-admin-api-key` (`ADMIN_API_KEY`) — which **defaults to open when the env var is unset**, so it must be set in production. Prompt-injection defense is applied on both the LLM and Paperclip paths (report content is framed as untrusted data).
- **Cross-platform edges**: files issues into CareSpace GitHub repos (frontend/backend, AI-routed), tasks into ClickUp, attachments into Azure Blob (`carespacbugattach`), and hands off to the Paperclip Bug Triage agent on `office.carespace.ai`.

## Shared Conventions

- Client↔server transport is **multipart FormData**, never JSON.
- Every external call is meant to be wrapped in the circuit breaker + exponential-backoff retry (`lib/circuit-breaker`, `lib/retry-handler`).
- Stateful primitives (rate limiter, queue, mappings, webhook store, circuit states) are **in-memory singletons** — per-instance, reset on redeploy, not shared across serverless instances (upgrade to Redis for scale).
- Several features ship **disabled** (`.disabled`): two-way GitHub/ClickUp sync, AI duplicate detection, admin settings, auto-assignment. See CLAUDE.md "Disabled Features".

## Related Context

- [lib](./lib/AGENTS.md) — backend service layer (business logic, integrations, resilience)
- [app](./app/AGENTS.md) — Next.js frontend + API routes
- [app/api](./app/api/AGENTS.md) — HTTP route handlers
- [chrome-extension](./chrome-extension/AGENTS.md) — in-browser capture client
