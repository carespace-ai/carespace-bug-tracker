# 🐛 Carespace Bug Tracker

An automated bug tracking system that collects customer bug reports, enhances them with AI, and automatically creates GitHub issues and ClickUp tasks.

## 🌟 Features

- **📝 User-Friendly Bug Submission Form** - Clean, intuitive interface for customers to report bugs
- **🤖 AI-Powered Enhancement** - Uses Claude AI to analyze and enhance bug reports with:
  - Detailed technical descriptions
  - Suggested labels and categorization
  - Technical context for developers
  - Ready-to-use Claude Code prompts for fixing issues
  - Automatic priority scoring
- **🔗 GitHub Integration** - Automatically creates well-formatted GitHub issues
- **📊 ClickUp Integration** - Logs tasks in ClickUp for project management
- **⚡ Serverless Architecture** - Built with Next.js, ready for Vercel deployment

## 🏗️ Architecture

### Workflow

1. **Customer submits bug** → Web form
2. **AI Enhancement** → Claude analyzes and enriches the report
3. **GitHub Issue** → Automatically created with enhanced details
4. **ClickUp Task** → Logged for project tracking
5. **Developer Action** → Uses provided Claude Code prompt to fix

### Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **AI**: Anthropic Claude 3.5 Sonnet
- **Integrations**: GitHub API, ClickUp API
- **Deployment**: Vercel (recommended)

## 🚀 Setup

### Prerequisites

- Node.js 18+ and npm
- GitHub account with repository access
- ClickUp account
- Anthropic API key

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

4. **Edit `.env.local` with your credentials**

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
   - Open ClickUp and navigate to the list where you want tasks created
   - The URL will look like: `https://app.clickup.com/[team]/[space]/[folder]/[list_id]`
   - Copy the list ID to `CLICKUP_LIST_ID`

#### Anthropic API Key
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new key
5. Copy to `ANTHROPIC_API_KEY` in `.env.local`

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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
   ```

### Option 2: Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Add environment variables in the project settings
6. Deploy!

## 📖 Usage

### For Customers (Bug Reporters)

1. Navigate to the bug tracker URL
2. Fill out the form with:
   - **Title**: Brief description of the bug
   - **Description**: Detailed explanation
   - **Steps to Reproduce**: How to trigger the bug
   - **Expected vs Actual Behavior**: What should happen vs what happens
   - **Severity**: Low, Medium, High, or Critical
   - **Category**: UI, Functionality, Performance, Security, or Other
   - **Optional**: Email, environment, browser info
3. Click "Submit Bug Report"
4. Receive confirmation with links to GitHub issue and ClickUp task

### For Developers

1. **Check GitHub Issues**: New issues are automatically created with:
   - Enhanced description from AI
   - Technical context
   - Suggested labels
   - **Claude Code Prompt** section with ready-to-use prompt

2. **Use Claude Code**: Copy the prompt from the issue and use it with Claude Code to generate fixes

3. **Track in ClickUp**: All activities are logged in ClickUp for project management

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
│   │   └── submit-bug/
│   │       └── route.ts          # API endpoint for bug submission
│   ├── page.tsx                  # Main bug submission form
│   ├── layout.tsx                # App layout
│   └── globals.css               # Global styles
├── lib/
│   ├── types.ts                  # TypeScript type definitions
│   ├── llm-service.ts            # AI enhancement logic
│   ├── github-service.ts         # GitHub API integration
│   └── clickup-service.ts        # ClickUp API integration
├── .env.local                    # Environment variables (not in git)
├── .env.example                  # Example environment variables
└── README.md                     # This file
```

## 🔒 Security Notes

- Never commit `.env.local` to version control
- Keep API keys secure
- Use environment variables in Vercel for production
- Implement rate limiting for production use
- Consider adding authentication for the submission form

## 🐛 Troubleshooting

### "Failed to create GitHub issue"
- Check that `GITHUB_TOKEN` has `repo` scope
- Verify `GITHUB_OWNER` and `GITHUB_REPO` are correct
- Ensure the repository exists and token has access

### "Failed to create ClickUp task"
- Verify `CLICKUP_API_KEY` is valid
- Check that `CLICKUP_LIST_ID` is correct
- Ensure you have permission to create tasks in that list

### "Error enhancing bug report"
- Check `ANTHROPIC_API_KEY` is valid
- Verify you have API credits
- Check API rate limits

## 📝 Future Enhancements

- [ ] Add authentication for bug submission
- [ ] Email notifications to reporters
- [ ] Attachment support (screenshots, logs)
- [ ] Integration with more project management tools
- [ ] Analytics dashboard
- [ ] Duplicate bug detection
- [ ] Auto-assignment based on category
- [ ] Webhook support for real-time updates

## 📄 License

MIT License - feel free to use and modify for your needs.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

**Built with ❤️ for Carespace**
