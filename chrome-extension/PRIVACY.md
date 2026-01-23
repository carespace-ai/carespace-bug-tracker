# Privacy Policy - Carespace Bug Reporter Chrome Extension

**Last Updated: January 23, 2026**

## Overview

Carespace Bug Reporter ("the Extension") is a Chrome extension that allows users to report bugs directly from their browser. This privacy policy explains what data we collect, how we use it, and your rights.

## Data Collection

### Information We Collect

When you submit a bug report, we collect:

1. **User-Provided Information**:
   - Bug title and description
   - Steps to reproduce
   - Expected and actual behavior
   - Severity and category selection
   - Email address (optional)
   - File attachments (optional)

2. **Automatically Collected Information**:
   - Current page URL
   - Current page title
   - Browser version and operating system
   - Screenshot of visible page (only if enabled by user)
   - Selected text (only if using context menu feature)
   - Timestamp of submission

### Information We Do NOT Collect

- Browsing history
- Passwords or credentials
- Personal data from other websites
- Cookies or tracking data
- Financial information
- Data from pages you don't explicitly report

## How We Use Your Data

Your data is used to:

1. **Create Bug Reports**: Submit your bug report to our automated bug tracking system
2. **AI Enhancement**: Process your bug report with Claude AI to enhance technical details
3. **Issue Tracking**: Create GitHub issues and ClickUp tasks for development teams
4. **Communication**: Contact you for follow-up (only if you provide an email)

### Data Processing

- **AI Processing**: Bug reports are sent to Anthropic's Claude API for enhancement
- **GitHub**: Issues are created in the specified GitHub repository
- **ClickUp**: Tasks are created in the configured ClickUp workspace
- **File Storage**: Attachments are uploaded to GitHub as issue attachments

## Data Storage and Retention

### Where Data is Stored

- **GitHub**: Bug reports are stored as GitHub issues (subject to GitHub's privacy policy)
- **ClickUp**: Bug reports are stored as ClickUp tasks (subject to ClickUp's privacy policy)
- **Anthropic**: Bug descriptions are processed but not retained by Anthropic per their privacy policy
- **Extension**: No data is permanently stored in the extension itself

### How Long We Keep Data

- Bug reports remain in GitHub and ClickUp until manually deleted by administrators
- Temporary data (screenshots, context) is only held during submission
- No data is cached or stored locally in the extension after submission

## Data Sharing

We share your data with:

1. **Anthropic** (Claude AI): For bug report enhancement
2. **GitHub**: For issue creation and tracking
3. **ClickUp**: For task management
4. **Vercel**: Hosting platform for our API (may process requests in transit)

We do NOT:
- Sell your data to third parties
- Use your data for advertising
- Share your data with unauthorized parties
- Track your browsing activity

## Your Rights

You have the right to:

1. **Access**: Request a copy of your submitted bug reports
2. **Deletion**: Request deletion of specific bug reports
3. **Correction**: Request updates to submitted bug reports
4. **Opt-out**: Stop using the extension at any time

To exercise these rights, contact the development team through the GitHub repository.

## Data Security

We implement security measures including:

- HTTPS encryption for all data transmission
- API rate limiting (5 requests per 15 minutes per IP)
- Input validation and sanitization
- No storage of sensitive credentials in the extension
- Server-side API key management

## Third-Party Services

This extension integrates with:

### Anthropic Claude API
- Privacy Policy: https://www.anthropic.com/privacy
- Purpose: AI-powered bug report enhancement
- Data Shared: Bug descriptions, titles, context

### GitHub
- Privacy Policy: https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement
- Purpose: Issue creation and tracking
- Data Shared: All bug report data, attachments

### ClickUp
- Privacy Policy: https://clickup.com/privacy
- Purpose: Task management
- Data Shared: All bug report data

### Vercel
- Privacy Policy: https://vercel.com/legal/privacy-policy
- Purpose: API hosting
- Data Shared: HTTP requests (processed in transit)

## Children's Privacy

This extension is not intended for children under 13. We do not knowingly collect data from children.

## Changes to Privacy Policy

We may update this privacy policy. Changes will be reflected in the "Last Updated" date. Continued use of the extension after changes constitutes acceptance.

## Permissions Explained

The extension requests these Chrome permissions:

### activeTab
**Purpose**: Capture screenshots of the current tab
**Data Access**: Only the visible area of the active tab when you submit a bug
**User Control**: Screenshot capture can be disabled in the form

### tabs
**Purpose**: Get current page URL and title
**Data Access**: Only URL and title of the active tab when submitting
**User Control**: This context is automatically included to help identify the bug location

### scripting
**Purpose**: Future feature for enhanced bug detection
**Data Access**: None currently used
**User Control**: Not currently active

### contextMenus
**Purpose**: Add right-click menu options
**Data Access**: Selected text if you use "Report Bug with Selected Text"
**User Control**: Only activated when you explicitly right-click and choose the menu item

### storage
**Purpose**: Temporarily store context between context menu click and popup open
**Data Access**: Page URL, title, selected text (cleared after use)
**User Control**: Data is cleared immediately after the popup is opened

## Contact Information

For privacy questions or requests:

- **GitHub Issues**: Open an issue in the carespace-bug-tracker repository
- **Email**: [Your support email]

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)

## Your Consent

By using this extension, you consent to this privacy policy.

## Data Deletion

To request deletion of your data:

1. **GitHub Issues**: Contact repository administrators
2. **ClickUp Tasks**: Contact workspace administrators
3. **Extension Data**: Uninstall the extension (no local data is stored)

---

**Note to Developers**: Before publishing, update:
- Support email address
- Organization/company name if applicable
- Any additional data collection you add
- Links to your support channels
