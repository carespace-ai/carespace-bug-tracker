# Intelligent Repository Routing

## Overview

The bug tracker now uses AI (Claude 3.5 Sonnet) to automatically route bug reports to the correct GitHub repository based on analysis of the bug's nature.

## How It Works

### 1. AI Analysis
When a bug report is submitted, Claude analyzes:
- Bug description and title
- Category (ui, functionality, performance, security, other)
- Technical context from the bug details
- Steps to reproduce, expected vs actual behavior

### 2. Repository Determination
Claude determines whether the bug should go to:
- **Frontend Repository** (`carespace-frontend`): UI/UX issues, rendering problems, client-side validation, styling, browser-specific bugs, responsive design, user interactions, React components
- **Backend Repository** (`carespace-backend`): API errors, database issues, server-side logic, authentication/authorization, data processing, server-level performance issues

### 3. Fallback Logic
If AI analysis fails or returns invalid data, the system uses category-based fallback:
- `ui` → `frontend`
- `functionality` → `frontend` (most user-facing issues)
- `security` → `backend`
- `performance` → `backend`
- `other` → `frontend` (default)

## Configuration

### Environment Variables

Add these to your `.env.local`:

```bash
# GitHub Organization
GITHUB_OWNER=carespace-ai

# Target repositories for bug routing
GITHUB_REPO_FRONTEND=carespace-frontend
GITHUB_REPO_BACKEND=carespace-backend

# Attachments storage (keeps using bug tracker repo)
GITHUB_REPO=carespace-bug-tracker

# Other required variables
GITHUB_TOKEN=ghp_your-token-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLICKUP_API_KEY=pk_your-key-here
CLICKUP_LIST_ID=your-list-id-here
```

### Repository Setup

Ensure both frontend and backend repositories exist in your GitHub organization:
- `carespace-ai/carespace-frontend`
- `carespace-ai/carespace-backend`

The GitHub token must have write access to both repositories.

## Implementation Details

### Modified Files

1. **lib/types.ts**
   - Added `targetRepo: 'frontend' | 'backend'` field to `EnhancedBugReport`
   - Updated `SubmitBugResponse` to include `targetRepo` in response

2. **lib/ai-settings.ts**
   - Updated default prompt template to include repository determination instructions
   - AI now returns `targetRepo` in its JSON response

3. **lib/llm-service.ts**
   - Added `determineRepoFromCategory()` helper function for fallback logic
   - Enhanced `enhanceBugReport()` to extract and validate `targetRepo` from AI response
   - Updated fallback logic to include `targetRepo` determination

4. **lib/github-service.ts**
   - Added repository configuration with `REPOS` object
   - Updated `createGitHubIssue()` to route to correct repository
   - Added logging to show which repository issues are created in
   - File attachments continue to be stored in the bug tracker repository
   - Updated `addCommentToIssue()` to accept `targetRepo` parameter (for future sync feature)

5. **app/api/submit-bug/route.ts**
   - Updated API response to include `targetRepo` field

6. **CLAUDE.md**
   - Added documentation for intelligent routing feature
   - Updated request flow diagram
   - Added configuration instructions

### API Response Example

```json
{
  "success": true,
  "message": "Bug report submitted successfully",
  "data": {
    "githubIssue": "https://github.com/carespace-ai/carespace-frontend/issues/42",
    "clickupTask": "https://app.clickup.com/t/...",
    "enhancedReport": {
      "title": "Login button not responding",
      "priority": 4,
      "labels": ["bug", "ui", "high"],
      "targetRepo": "frontend"
    }
  }
}
```

### GitHub Issue Metadata

Each created issue includes the target repository in its metadata:
- Issue body includes: `**Repository**: frontend` or `**Repository**: backend`
- Footer notes: `*This issue was automatically created from a customer bug report and routed to the {targetRepo} repository.*`

## Testing

### Unit Tests
Run the LLM service tests to verify routing logic:
```bash
npm test -- lib/llm-service.test.ts
```

Test coverage includes:
- AI-based repository determination for frontend bugs
- AI-based repository determination for backend bugs
- Fallback to category-based routing when AI doesn't provide targetRepo
- Category-based fallback when API fails completely
- Correction of invalid targetRepo values from AI

### Manual Testing
1. Submit a UI-related bug (should go to frontend)
2. Submit an API-related bug (should go to backend)
3. Check the returned `targetRepo` in the API response
4. Verify the issue was created in the correct repository on GitHub

## Benefits

1. **Automatic Organization**: No manual triage needed to route bugs to correct repos
2. **Intelligent Analysis**: AI understands context beyond simple keyword matching
3. **Fault Tolerant**: Fallback logic ensures bugs are always routed somewhere
4. **Transparent**: Response includes which repo was selected
5. **Audit Trail**: Issue metadata shows routing decision

## Future Enhancements

- [ ] Add repo routing history/analytics
- [ ] Support for additional repositories (mobile, infrastructure, etc.)
- [ ] Machine learning to improve routing accuracy over time
- [ ] User override option to manually specify target repo
- [ ] Confidence score from AI for routing decision
