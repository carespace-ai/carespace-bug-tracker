/**
 * Help text content for form fields
 * Provides contextual guidance to users when filling out bug reports
 */

export interface FieldHelp {
  title: string;
  description: string;
}

export const formFieldHelp: Record<string, FieldHelp> = {
  title: {
    title: "Bug Title",
    description: "A clear, concise summary of the issue. Example: 'Login button not responding on mobile devices'",
  },

  description: {
    title: "Bug Description",
    description: "Provide a detailed explanation of the problem. Include what you were trying to do and what went wrong.",
  },

  stepsToReproduce: {
    title: "Steps to Reproduce",
    description: "List the exact steps needed to trigger this bug. Example: 1. Go to login page, 2. Enter credentials, 3. Click submit button. Clear steps help developers fix issues faster.",
  },

  expectedBehavior: {
    title: "Expected Behavior",
    description: "Describe what you expected to happen. Example: 'The form should submit and redirect to the dashboard'",
  },

  actualBehavior: {
    title: "Actual Behavior",
    description: "Describe what actually happened instead. Example: 'The button appears to click but nothing happens'",
  },

  severity: {
    title: "Severity Level",
    description: "Rate the impact of this bug. Critical: System down or data loss. High: Major feature broken. Medium: Feature partially working. Low: Minor inconvenience or cosmetic issue.",
  },

  category: {
    title: "Bug Category",
    description: "Select the type that best matches this issue. UI: Visual/layout problems. Functionality: Features not working. Performance: Speed/loading issues. Security: Safety concerns. Other: Doesn't fit other categories.",
  },

  userEmail: {
    title: "Your Email",
    description: "Optional. Provide your email if you'd like updates on this bug or if developers need more information from you.",
  },

  environment: {
    title: "Environment Details",
    description: "Describe your system setup. Example: 'Windows 11, Chrome 120, Production environment'. Include OS, device type, and any relevant software versions.",
  },

  browserInfo: {
    title: "Browser Information",
    description: "Specify browser details. Example: 'Chrome 120.0.6099.109 on Windows'. We'll try to detect this automatically, but you can provide additional details here.",
  },

  attachments: {
    title: "Attachments",
    description: "Upload screenshots, videos, or log files that help illustrate the problem. Supported formats: images, videos, and text files. Max 10MB per file.",
  },
};
