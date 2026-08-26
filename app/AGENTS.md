# app — Next.js Application (Frontend + API)

> The Next.js App Router surface: the public bug-report web form (`page.tsx` + `components/*` + `hooks/useBugReportForm`) and the server route handlers under `api/` that intake submissions and drive the `lib` service layer.

## System Architecture

```
┌───────────────────────────────────────────────────────────┐
│  app/ (Next.js App Router)                                 │
│  ┌────────────────────────┐   ┌───────────────────────┐   │
│  │  Frontend (client)     │   │  API routes (server)  │   │
│  │  page.tsx              │   │  api/submit-bug       │   │
│  │  components/BugReport* │──▶│  api/retry-submissions│   │
│  │  components/FormFields │   │  api/webhooks/*       │   │
│  │  hooks/useBugReportForm│   │                       │   │
│  └───────────┬────────────┘   └───────────┬───────────┘   │
└──────────────┼────────────────────────────┼───────────────┘
               │  POST FormData             │ delegates to
               ▼                            ▼
        /api/submit-bug             ┌───────────────┐
                                    │     lib/      │
                                    │  services     │
                                    └───────────────┘
```

## Data Flow

### Bug submission (web form)

1. **User fills form** → `page.tsx` / `components/BugReportForm` with real-time field validation (`lib/hooks/useFieldValidation`).
2. `hooks/useBugReportForm` → builds `multipart/form-data` (fields + attachments) → **POST** `/api/submit-bug`.
3. `middleware.ts` attaches CORS + `X-Request-ID`.
4. `api/submit-bug` → rate-limit → validate → Azure upload → **Paperclip handoff OR legacy enhance+GitHub+ClickUp** (see `app/api/AGENTS.md`).
5. Response → `components/SubmitResult` renders success (issue links) or error.

### Chrome extension submission

`chrome-extension` captures page context + screenshot and POSTs to the same `/api/submit-bug` endpoint — the extension is a second client of this API, not part of `app/`.

## System Boundaries

| System | Owns | Does NOT Own |
|--------|------|--------------|
| Frontend (`page`, `components`, `hooks`) | Form UX, client validation, result display | Persistence, external API calls |
| `api/` routes | HTTP intake, rate-limit, validation, orchestration | Business logic (delegates to `lib`) |
| `lib` | Enhancement, integrations, resilience | Rendering, routing |

## Dependency Direction

```
app/components + app/hooks → lib (types, validation, helpers)
app/api             → lib (services)
```

**Rule**: dependencies point toward `lib`. `lib` never imports from `app`. Confirmed by CodeGraph `module_dependencies` (all `app/*` edges target `lib`).

## Shared Conventions

- Client↔server transport is **multipart FormData**, never JSON (attachments).
- Optional form fields coerce `''` → `undefined` before validation.
- i18n via `lib/i18n` (`useTranslation`, `LanguageSelector`); browser/language auto-detected by `lib/browser-detection`.
- `app/admin/layout.tsx` exists but the admin settings page is disabled (`.disabled`).

## Related Context

- [api](./api/AGENTS.md) — HTTP route handlers (intake + orchestration)
- [../lib](../lib/AGENTS.md) — backend service layer (business logic)
- [../chrome-extension](../chrome-extension/AGENTS.md) — second client of `/api/submit-bug`
