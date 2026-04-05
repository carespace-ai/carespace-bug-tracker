# Pipeline Run

## Task
Fix 8+ vulnerable dependencies in carespace-bot-teams (Issue #1)
- SOC scan found 9 vulnerabilities: 2 moderate, 6 high, 1 critical

## Type
security-fix

## Status
COMPLETE

## Investigation
Root cause: outdated transitive and direct dependencies with known CVEs.

### Vulnerabilities found (npm audit):
1. **ajv** <6.14.0 — ReDoS with `$data` option (moderate)
2. **axios** 1.0.0-1.13.4 — DoS via __proto__ in mergeConfig (high)
3. **brace-expansion** <1.1.13 — zero-step sequence hang (moderate)
4. **fast-xml-parser** 4.0.0β-5.5.6 — stack overflow, entity expansion bypass (high)
5. **flatted** ≤3.4.1 — unbounded recursion DoS, prototype pollution (high)
6. **handlebars** 4.0.0-4.7.8 — JS injection, prototype pollution, XSS (critical)
7. **minimatch** ≤3.1.3 — ReDoS via repeated wildcards (high)
8. **next** 15.6.0-canary.0 to 16.1.6 — 8 CVEs: DoS, CSRF bypass, request smuggling, memory exhaustion (high)
9. **picomatch** ≤2.3.1 — method injection, ReDoS (high)

## Build
### Changes made:
- `package.json`: next 16.1.4 → 16.2.2, eslint-config-next 16.1.4 → 16.2.2
- `package-lock.json`: transitive deps updated via `npm audit fix`

### Verification:
- `npm audit` — **0 vulnerabilities**
- `npm run build` — **passes** (Next.js 16.2.2 Turbopack)
- `npm test` — 255 passed, 24 failed (same as main branch — pre-existing failures)

## Review
- Changes limited to dependency version bumps only
- No source code modifications
- next 16.1.4 → 16.2.2 is a minor/patch semver bump (compatible)
- eslint-config-next synced to match next version
- Build and test results identical to main branch
- Verdict: **PASS**

## Security
- All 9 CVEs resolved (0 remaining per npm audit)
- No new dependencies introduced
- No code changes that could introduce new attack surface
- Verdict: **PASS**

## QA
- Build: passes
- Tests: 255/279 pass (same as main — no regression)
- No browser testing needed (dependency-only change)
- Verdict: **PASS**
