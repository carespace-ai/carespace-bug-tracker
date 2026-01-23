# Codebase Context Configuration

## Overview

To provide accurate and actionable bug analysis, the AI needs context about your actual codebases (carespace-frontend and carespace-backend). The `codebase-context.json` file allows you to describe your application architecture, patterns, and conventions.

## Why This Matters

Without codebase context, the AI can only make generic guesses:
- ❌ "Check the authentication logic" (vague)
- ❌ "Fix the form validation" (no specific location)
- ❌ "Update the API endpoint" (which one?)

With codebase context, the AI provides specific, actionable guidance:
- ✅ "Check `src/middleware/auth.ts` line 45, the JWT validation logic"
- ✅ "Fix form validation in `components/forms/UserProfileForm.tsx` using the Zod schema"
- ✅ "Update the `/api/users` endpoint in `app/api/users/route.ts`"

## How to Configure

### 1. Edit `codebase-context.json`

Fill in accurate information about your codebases:

```json
{
  "frontend": {
    "name": "carespace-frontend",
    "techStack": {
      "framework": "Next.js 14 App Router",
      "styling": "Tailwind CSS with shadcn/ui",
      "stateManagement": "React Context + Zustand",
      "authentication": "NextAuth.js"
    },
    "architecture": {
      "keyDirectories": [
        "app/ - Next.js pages (app router)",
        "components/ui/ - Reusable UI components",
        "components/forms/ - Form components",
        "lib/api/ - API client functions",
        "hooks/ - Custom React hooks"
      ]
    },
    "commonPatterns": [
      "Use 'use client' for interactive components",
      "API calls through lib/api/client.ts fetch wrapper",
      "Form validation with Zod schemas in lib/schemas/",
      "Error handling with error.tsx and ErrorBoundary"
    ]
  }
}
```

### 2. Be Specific About File Locations

Instead of:
```json
"keyDirectories": ["components/"]
```

Do this:
```json
"keyDirectories": [
  "components/ui/ - shadcn/ui components (Button, Input, etc.)",
  "components/forms/ - Form components with validation",
  "components/dashboard/ - Dashboard-specific components",
  "components/layout/ - Layout wrappers (Navbar, Sidebar)"
]
```

### 3. Document Known Issues

Add recurring problems so AI can reference them:

```json
"knownIssues": [
  "CORS errors: Check middleware.ts for allowed origins",
  "Auth redirect loops: Verify callbacks in auth.config.ts",
  "Form submission 400 errors: Check Zod schema in lib/schemas/",
  "Database timeouts: Connection pool exhausted, check db.ts"
]
```

### 4. Include Integration Details

```json
"integrations": [
  "Backend API at https://api.carespace.ai",
  "Authentication via NextAuth with GitHub + Email providers",
  "File uploads to AWS S3 via presigned URLs",
  "Real-time updates through Pusher websockets",
  "Analytics via PostHog"
]
```

## What Gets Included in AI Prompts

When analyzing a bug, the AI receives:

1. **Bug report data** (title, description, steps, etc.)
2. **Codebase context** for BOTH frontend and backend
3. **Tech stack details** (frameworks, libraries, tools)
4. **Architecture patterns** (directory structure, conventions)
5. **Known issues** (common problems and their locations)
6. **Integration info** (external services, APIs)

The AI uses this to provide:
- Specific file paths to check
- Relevant functions or components
- Architectural patterns to follow
- Step-by-step fix instructions with actual code references

## Example: Before vs After

### Before (No Context)
```
Bug: Login button doesn't work

AI Analysis:
- Check the login component
- Verify the authentication logic
- Test the API endpoint
- Fix the button click handler
```

### After (With Context)
```
Bug: Login button doesn't work

AI Analysis:
Root Cause: Likely a validation error in the authentication flow

Codebase Context:
- Check components/auth/LoginForm.tsx (form component)
- Verify lib/api/auth.ts login() function
- Check app/api/auth/[...nextauth]/route.ts (NextAuth config)
- Review middleware.ts for auth redirects

Fix Instructions:
1. Open components/auth/LoginForm.tsx
2. Check the onSubmit handler around line 42
3. Verify the Zod schema in lib/schemas/auth.ts matches API requirements
4. Add error logging in the try-catch block
5. Test with valid credentials to see actual API error
6. Check app/api/auth/[...nextauth]/route.ts callbacks configuration
```

## Maintenance

### When to Update

Update `codebase-context.json` when you:
- Add new major features or modules
- Refactor architecture (e.g., move from Pages Router to App Router)
- Change frameworks or libraries
- Add/remove integrations
- Discover recurring bugs (add to knownIssues)

### How Often

- **Major releases**: Update architecture and patterns
- **Monthly**: Review and update knownIssues
- **After refactoring**: Update file paths and patterns
- **When onboarding**: Review with new team members for accuracy

## Tips for Better Context

1. **Use actual file paths**: `components/auth/LoginForm.tsx` not just "login form"
2. **Include line number hints**: "Check validation around line 45"
3. **Reference patterns**: "All API routes use the withAuth HOC"
4. **Add examples**: "Similar to how UserForm.tsx handles validation"
5. **Document conventions**: "All hooks are in hooks/ and prefixed with use"

## Testing Your Context

After updating the context, submit a test bug report and check if the AI provides:
- ✅ Specific file paths
- ✅ Relevant function names
- ✅ Architectural pattern references
- ✅ Actionable, step-by-step instructions

If the AI output is still generic, add more specific information to the context file.

## Need Help?

The `codebase-context.json` file includes a `_instructions` section with more tips and examples. You can also reference this document for guidance.

---

**Remember**: The more specific and accurate your codebase context, the better the AI can help developers (and Claude Code) fix bugs efficiently!
