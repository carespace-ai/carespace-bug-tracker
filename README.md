# CareSpace Bug Tracker

An automated bug tracking system that collects customer bug reports via web form or Chrome extension, enhances them with AI (Claude Opus 4.5), and automatically creates GitHub issues and ClickUp tasks with intelligent repository routing.

## 🌟 Features

* **📝 User-Friendly Bug Submission** - Multiple ways to report bugs:
  * Web form - Clean, intuitive interface
  * **Chrome Extension** - One-click bug reporting from any CareSpace page with auto-screenshot capture and form state persistence
* **🤖 AI-Powered Enhancement** - Uses Claude Opus 4.5 to analyze and enhance bug reports with:
  * Detailed technical descriptions
  * Suggested labels and categorization
  * Technical context for developers
  * Ready-to-use Claude Code prompts for fixing issues
  * Automatic priority scoring
* **🔗 GitHub Integration** - Automatically creates well-formatted GitHub issues
* **📊 ClickUp Integration** - Logs tasks in ClickUp for project management
* **🔄 Two-Way Sync** - Bidirectional synchronization between GitHub and ClickUp:
  * Status changes sync automatically (open/closed ↔ to do/complete)
  * Comments sync in both directions
  * Labels/tags sync bidirectionally
  * Conflict resolution with timestamp-based logic
  * Sub-1-minute sync latency
* **🛡️ Rate Limiting Protection** - Built-in protection against spam and abuse (5 requests per 15 min per IP)
* **⚡ Serverless Architecture** - Built with Next.js, ready for Vercel deployment

## 🏗️ Architecture

### Workflow


1. **Customer submits bug** → Web form
2. **AI Enhancement** → Claude analyzes and enriches the report
3. **GitHub Issue** → Automatically created with enhanced details
4. **ClickUp Task** → Logged for project tracking
5. **Two-Way Sync** → Changes in GitHub or ClickUp automatically sync
6. **Developer Action** → Uses provided Claude Code prompt to fix

### Tech Stack

* **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
* **Backend**: Next.js API Routes (serverless)
* **AI**: Anthropic Claude Opus 4.5
* **Integrations**: GitHub API, ClickUp API
* **Deployment**: Vercel (recommended)

## 🚀 Setup

### Prerequisites

* Node.js 18+ and npm
* GitHub account with repository access
* ClickUp account
* Anthropic API key

### Installation


1. **Clone or navigate to the project**

   ```bash
   cd /a0/usr/projects/carespace/bug-tracker
   ```
2. **Install dependencies**

   ```bash
   npm install
   ```
3. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```
4. **Edit** `.env.local` with your credentials

### Required API Keys and Configuration

#### GitHub Token


1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full control)
4. Copy the token to `GITHUB_TOKEN` in `.env.local`
5. Set `GITHUB_OWNER` to your username or organization
6. Set `GITHUB_REPO` to your repository name (e.g., "carespace")

#### ClickUp API Key


1. Go to [ClickUp Settings → Apps](https://app.clickup.com/settings/apps)
2. Click "Generate" under API Token
3. Copy the token to `CLICKUP_API_KEY` in `.env.local`
4. Get your List ID:
   * Open ClickUp and navigate to the list where you want tasks created
   * The URL will look like: `https://app.clickup.com/[team]/[space]/[folder]/[list_id]`
   * Copy the list ID to `CLICKUP_LIST_ID`

#### Anthropic API Key


1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new key
5. Copy to `ANTHROPIC_API_KEY` in `.env.local`

#### Webhook Secrets (Required for Two-Way Sync)

For two-way synchronization between GitHub and ClickUp, you need to configure webhook secrets:

```bash
# Generate secure random secrets
openssl rand -hex 32  # Use for GITHUB_WEBHOOK_SECRET
openssl rand -hex 32  # Use for CLICKUP_WEBHOOK_SECRET
```

Add these to `.env.local`:

* `GITHUB_WEBHOOK_SECRET` - Secret for verifying GitHub webhook requests
* `CLICKUP_WEBHOOK_SECRET` - Secret for verifying ClickUp webhook requests

**📖 See [WEBHOOK_SETUP.md](docs/setup/WEBHOOK_SETUP.md) for complete webhook configuration instructions.**

### Running Locally

```bash
npm run dev
```

Open <http://localhost:3000> in your browser.

## 🌐 Deployment to Vercel

### Option 1: Vercel CLI


1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   ```
2. **Login to Vercel**

   ```bash
   vercel login
   ```
3. **Deploy**

   ```bash
   vercel
   ```
4. **Set environment variables in Vercel**

   ```bash
   vercel env add GITHUB_TOKEN
   vercel env add GITHUB_OWNER
   vercel env add GITHUB_REPO
   vercel env add CLICKUP_API_KEY
   vercel env add CLICKUP_LIST_ID
   vercel env add ANTHROPIC_API_KEY
   vercel env add GITHUB_WEBHOOK_SECRET
   vercel env add CLICKUP_WEBHOOK_SECRET
   ```

### Option 2: Vercel Dashboard


1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Add environment variables in the project settings (including webhook secrets)
6. Deploy!
7. Configure webhooks (see [WEBHOOK_SETUP.md](docs/setup/WEBHOOK_SETUP.md))

## 📖 Usage

### For Customers (Bug Reporters)


1. Navigate to the bug tracker URL
2. Fill out the form with:
   * **Title**: Brief description of the bug
   * **Description**: Detailed explanation
   * **Steps to Reproduce**: How to trigger the bug
   * **Expected vs Actual Behavior**: What should happen vs what happens
   * **Severity**: Low, Medium, High, or Critical
   * **Category**: UI, Functionality, Performance, Security, or Other
   * **Optional**: Email, environment, browser info
3. Click "Submit Bug Report"
4. Receive confirmation with links to GitHub issue and ClickUp task

### For Developers


1. **Check GitHub Issues**: New issues are automatically created with:
   * Enhanced description from AI
   * Technical context
   * Suggested labels
   * **Claude Code Prompt** section with ready-to-use prompt
2. **Use Claude Code**: Copy the prompt from the issue and use it with Claude Code to generate fixes
3. **Track in ClickUp**: All activities are logged in ClickUp for project management
4. **Two-Way Sync**: Changes sync automatically between GitHub and ClickUp:
   * Close issues in GitHub → Task completes in ClickUp
   * Update task status in ClickUp → Issue updates in GitHub
   * Add comments in either platform → Comments appear in both
   * Add labels/tags → Sync across both platforms

See [WEBHOOK_SETUP.md](docs/setup/WEBHOOK_SETUP.md) for webhook configuration.

## 🔧 Customization

### Modify GitHub Issue Template

Edit `lib/github-service.ts` → `createGitHubIssue()` function

### Adjust AI Enhancement Prompt

Edit `lib/llm-service.ts` → `enhanceBugReport()` function

### Change Form Fields

Edit `app/page.tsx` and `lib/types.ts`

### Customize Styling

Edit `app/page.tsx` - uses Tailwind CSS classes

## 📁 Project Structure

```
bug-tracker/
├── app/
│   ├── api/
│   │   ├── submit-bug/
│   │   │   └── route.ts          # API endpoint for bug submission
│   │   └── webhooks/
│   │       ├── github/
│   │       │   └── route.ts      # GitHub webhook endpoint
│   │       └── clickup/
│   │           └── route.ts      # ClickUp webhook endpoint
│   ├── page.tsx                  # Main bug submission form
│   ├── layout.tsx                # App layout
│   └── globals.css               # Global styles
├── lib/
│   ├── types.ts                  # TypeScript type definitions
│   ├── rate-limiter.ts           # Rate limiting utility (sliding window)
│   ├── llm-service.ts            # AI enhancement logic
│   ├── github-service.ts         # GitHub API integration
│   ├── clickup-service.ts        # ClickUp API integration
│   ├── sync-storage.ts           # Sync mapping storage
│   ├── sync-service.ts           # Bidirectional sync logic
│   └── webhook-validator.ts      # Webhook signature verification
├── scripts/
│   ├── e2e-test-github-to-clickup.ts   # GitHub → ClickUp testing
│   ├── e2e-test-clickup-to-github.ts   # ClickUp → GitHub testing
│   ├── e2e-test-label-sync.ts          # Label/tag sync testing
│   └── verify-sync-mapping.ts          # Mapping verification utility
├── docs/                         # Documentation
│   ├── README.md                # Documentation index
│   ├── chrome-extension/        # Chrome extension docs
│   ├── setup/                   # Setup and configuration guides
│   └── testing/                 # Testing documentation
├── chrome-extension/            # Chrome extension source
├── .env.local                   # Environment variables (not in git)
├── README.md                    # This file
└── CLAUDE.md                    # Project-specific instructions for Claude Code
```

## 🔒 Security & Rate Limiting

### Rate Limiting Protection

The bug submission API endpoint (`/api/submit-bug`) is protected by rate limiting to prevent:

* Spam attacks and abuse
* API quota exhaustion (Anthropic, GitHub, ClickUp)
* Denial of service attacks
* Excessive API costs from malicious actors

**Current Limits**: **5 requests per 15 minutes** per IP address

### How It Works

The rate limiter uses a **sliding window algorithm** that tracks requests by client IP address:

* Requests are tracked per IP using the `X-Forwarded-For` or `X-Real-IP` headers
* After exceeding the limit, clients receive a `429 Too Many Requests` response
* Response includes `Retry-After` header indicating when they can retry
* Counters automatically clean up expired entries to prevent memory leaks

### Configuration

To adjust rate limits, edit the constants in `lib/rate-limiter.ts`:

```typescript
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5;           // 5 requests per window
```

### ⚠️ Production Deployment Considerations

**Important**: The current implementation uses **in-memory storage** which has limitations in production environments.

#### In-Memory Storage Limitations

* **Serverless/Auto-Scaling**: Each serverless function instance maintains its own memory. In auto-scaling environments (Vercel, AWS Lambda), different instances won't share rate limit state, reducing effectiveness.
* **Instance Restarts**: Rate limit counters reset when instances restart, scale down, or during deployments.
* **Multi-Server Deployments**: Not suitable for load-balanced or distributed systems without a shared data store.
* **Effectiveness**: Works best for single-instance deployments or low-traffic sites.

#### Recommended Production Upgrade

For production deployments at scale, **upgrade to Redis-based rate limiting** for shared state across all instances:

##### Option 1: Vercel KV (Recommended for Vercel)

```bash
npm install @vercel/kv
```

**Setup:**


1. Go to Vercel Dashboard → Your Project → Storage
2. Create a KV Database (powered by Upstash Redis)
3. Connect it to your project (environment variables are auto-configured)
4. Update `lib/rate-limiter.ts` to use `@vercel/kv`

##### Option 2: Upstash Redis (Works Anywhere)

```bash
npm install @upstash/redis
```

**Setup:**


1. Create account at [upstash.com](https://upstash.com/)
2. Create a Redis database (free tier available)
3. Add credentials to environment variables:

   ```
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token
   ```
4. Update `lib/rate-limiter.ts` to use Upstash Redis client

##### Migration Steps

To migrate from in-memory to Redis:


1. Install your chosen Redis client (see above)
2. Update `lib/rate-limiter.ts`:
   * Replace `Map` storage with Redis commands
   * Use `SETEX` or `EXPIRE` for automatic key expiration
   * Use `INCR` for atomic counter increments
   * Use `TTL` to check remaining time
3. Test thoroughly in staging environment
4. Deploy to production

**When In-Memory is Acceptable:**

* Development and testing environments
* Proof-of-concept or MVP phase
* Low-traffic production sites (<100 requests/hour)
* Single-instance deployments
* When enhanced by additional security layers (CDN, firewall)

### Other Security Best Practices

* Never commit `.env.local` to version control
* Keep API keys secure and rotate them periodically
* Use environment variables in Vercel for production
* Consider adding authentication for the submission form
* Monitor API usage and costs regularly
* Implement logging and alerting for suspicious activity

## 🐛 Troubleshooting

### "Failed to create GitHub issue"

* Check that `GITHUB_TOKEN` has `repo` scope
* Verify `GITHUB_OWNER` and `GITHUB_REPO` are correct
* Ensure the repository exists and token has access

### "Failed to create ClickUp task"

* Verify `CLICKUP_API_KEY` is valid
* Check that `CLICKUP_LIST_ID` is correct
* Ensure you have permission to create tasks in that list

### "Error enhancing bug report"

* Check `ANTHROPIC_API_KEY` is valid
* Verify you have API credits
* Check API rate limits

## 📝 Features Status

### ✅ Implemented
- [x] ~~Webhook support for real-time updates~~ (disabled - see docs/setup/WEBHOOK_SETUP.md)
- [x] ~~Two-way sync between GitHub and ClickUp~~ (disabled - see docs/setup/WEBHOOK_SETUP.md)
- [x] ~~Chrome Extension for easy bug reporting~~ (v1.0.0 released)
- [x] ~~Attachment support (screenshots, logs)~~ (Chrome extension)
- [x] ~~Authentication verification~~ (Chrome extension)
- [x] ~~AI-powered bug analysis with Claude Opus 4.5~~
- [x] ~~Intelligent repository routing (frontend/backend)~~
- [x] ~~Form state persistence~~ (Chrome extension)
- [x] ~~Rate limiting protection~~

### 🚧 Partially Implemented
- [ ] Auto-assignment based on category (code exists but not integrated)
- [ ] Duplicate bug detection (code exists but disabled)

### 📋 Future Enhancements
- [ ] Email notifications to reporters
- [ ] Integration with more project management tools (Jira, Linear, etc.)
- [ ] Analytics dashboard for bug trends
- [ ] Migrate rate limiter to Redis/Vercel KV for production scale
- [ ] Public API for third-party integrations

## 📄 License

Copyright © 2026 CareSpace. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.


---

**Built with ❤️ for Carespace**