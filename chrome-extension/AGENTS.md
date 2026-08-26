# chrome-extension — Bug Capture Client

> A Manifest-V3 Chrome extension that lets users report bugs from any page, auto-capturing screenshots and page context (URL, title, selected text), then POSTing to the tracker's `/api/submit-bug` endpoint — a second client of the same API the web form uses.

## Scope

**Owns**: In-browser capture UX — the popup form (`popup.html` / `popup.js` / `styles.css`), the service worker (`background.js`: context menus, badge, message routing), the content script (`content.js`: page-context extraction + auth check), and API endpoint selection (`config.js`).

**Does NOT own**: bug enhancement, issue creation, or persistence — all handled server-side by `app/api` + `lib`. It is a pure capture-and-submit client.

## Dependencies

### This System Depends On

| System | What's Used | Contract |
|--------|-------------|----------|
| Tracker API (`app/api/submit-bug`) | `POST` multipart FormData | URL from `config.js` (`PRODUCTION_API_URL` = `carespace-bug-tracker.vercel.app/api/submit-bug`, else `localhost:3000`) |
| Chrome Extension APIs | `chrome.tabs.captureVisibleTab`, `chrome.contextMenus`, `chrome.action`, `chrome.runtime`, `chrome.tabs` | MV3 service worker + content script |

### Systems That Depend On This

| System | How It's Used |
|--------|---------------|
| (none in-repo) | Standalone client; the server treats it like any other submitter. CORS for `chrome-extension://` origins is granted by root `middleware.ts` (`Access-Control-Allow-Origin: *`). |

## Integration Points

### → `/api/submit-bug`

**What's passed**: `multipart/form-data` — bug fields, captured environment/browser info, selected-text context, and an optional screenshot captured via `chrome.tabs.captureVisibleTab`.
**Who owns lifecycle**: server owns processing; extension owns only capture + submit and rendering the result.
**Contract**: must satisfy the same attachment limits as the web form (≤5 files, ≤10MB, allowed types); subject to the same per-IP rate limiting.

## Initialization & Lifecycle

**Created by**: Chrome — `background.js` registers context menus on `chrome.runtime.onInstalled`; `popup.js` runs on `DOMContentLoaded` when the popup opens.

**Lifecycle**: MV3 service worker is ephemeral (event-driven, may be torn down between events); popup state is persisted across opens via form-state save (`saveFormState`).

## State

**Holds**: transient popup form state (saved on input/change), a captured screenshot data URL, and the active tab reference. No durable server state.

## Key Invariants

- **Must**: pick the API URL from `config.js` based on environment — never hardcode elsewhere.
- **Must**: capture the screenshot from the *active* tab (`chrome.tabs.query({active:true,currentWindow:true})`) at submit time.
- **Assumes**: the content script can run in the page to extract context and perform the auth check; if not, the popup surfaces a retry/auth path.

## Patterns

```js
// Capture the visible tab as a screenshot attachment before POSTing
const screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
const res = await fetch(apiUrl, { method: 'POST', body: formData }); // multipart, no JSON
```

## Anti-patterns

```js
// ❌ Don't hardcode the prod URL inline
fetch('https://carespace-bug-tracker.vercel.app/api/submit-bug', ...)

// ✅ Do resolve it from config (handles prod vs. localhost)
fetch(Config.getApiUrl(), ...)
```

<!-- Built with chrome-extension/build.sh. See chrome-extension/README.md for load/setup instructions. -->
