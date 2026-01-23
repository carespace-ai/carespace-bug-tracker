import { readFileSync } from 'fs';
import { join } from 'path';

/* eslint-disable @typescript-eslint/no-explicit-any */

let cachedFrontend: any = null;
let cachedBackend: any = null;

/**
 * Load codebase context from separate frontend/backend files or combined file
 * Supports two patterns:
 * 1. Separate files: frontend-codebase-context.json + backend-codebase-context.json
 * 2. Combined file: codebase-context.json
 */
function loadRepoContext(repo: 'frontend' | 'backend'): any {
  // Check cache first
  if (repo === 'frontend' && cachedFrontend) return cachedFrontend;
  if (repo === 'backend' && cachedBackend) return cachedBackend;

  try {
    // Try loading separate file first (preferred)
    const separateFilePath = join(process.cwd(), `${repo}-codebase-context.json`);
    try {
      const content = readFileSync(separateFilePath, 'utf-8');
      const parsed = JSON.parse(content);

      // Cache and return
      const context = parsed[repo] || parsed;
      if (repo === 'frontend') cachedFrontend = context;
      if (repo === 'backend') cachedBackend = context;

      return context;
    } catch {
      // Separate file doesn't exist, try combined file
      const combinedFilePath = join(process.cwd(), 'codebase-context.json');
      const content = readFileSync(combinedFilePath, 'utf-8');
      const parsed = JSON.parse(content);

      const context = parsed[repo];
      if (repo === 'frontend') cachedFrontend = context;
      if (repo === 'backend') cachedBackend = context;

      return context;
    }
  } catch (error) {
    console.warn(`Could not load ${repo} codebase context, using empty context`);
    return null;
  }
}

/**
 * Format any object into a readable string for AI prompts
 */
function formatValue(value: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent);

  if (Array.isArray(value)) {
    return value.map(item => `${spaces}- ${formatValue(item, 0)}`).join('\n');
  }

  if (typeof value === 'object' && value !== null) {
    let result = '';
    for (const [key, val] of Object.entries(value)) {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

      if (Array.isArray(val)) {
        result += `\n${spaces}**${formattedKey}:**\n${formatValue(val, indent + 1)}`;
      } else if (typeof val === 'object' && val !== null) {
        result += `\n${spaces}**${formattedKey}:**${formatValue(val, indent + 1)}`;
      } else {
        result += `\n${spaces}- ${formattedKey}: ${val}`;
      }
    }
    return result;
  }

  return String(value);
}

/**
 * Extract key information from codebase context for AI prompt
 * Dynamically formats based on available fields
 */
export function formatCodebaseContextForPrompt(repo: 'frontend' | 'backend'): string {
  const context = loadRepoContext(repo);

  if (!context) {
    return `## ${repo.toUpperCase()} Codebase Context\n\nNo context available.\n`;
  }

  let formatted = `## ${repo.toUpperCase()} Codebase Context\n\n`;

  // Format basic info
  if (context.name) formatted += `**Repository:** ${context.name}\n`;
  if (context.description) formatted += `**Description:** ${context.description}\n\n`;

  // Format tech stack
  if (context.techStack) {
    formatted += `**Tech Stack:**${formatValue(context.techStack, 1)}\n\n`;
  }

  // Format architecture
  if (context.architecture) {
    formatted += `**Architecture:**${formatValue(context.architecture, 1)}\n\n`;
  }

  // Format path aliases (important for providing specific file paths)
  if (context.pathAliases && context.pathAliases.aliases) {
    formatted += `**Path Aliases (use these in file references):**\n`;
    for (const [alias, path] of Object.entries(context.pathAliases.aliases)) {
      formatted += `- ${alias} → ${path}\n`;
    }
    formatted += '\n';
  }

  // Format state management
  if (context.stateManagement) {
    formatted += `**State Management:**${formatValue(context.stateManagement, 1)}\n\n`;
  }

  // Format routing
  if (context.routing) {
    formatted += `**Routing:**${formatValue(context.routing, 1)}\n\n`;
  }

  // Format styling
  if (context.styling) {
    formatted += `**Styling:**${formatValue(context.styling, 1)}\n\n`;
  }

  // Format API integration
  if (context.api) {
    formatted += `**API Integration:**${formatValue(context.api, 1)}\n\n`;
  }

  // Format common patterns (critical for AI to follow conventions)
  if (context.commonPatterns) {
    formatted += `**Common Patterns to Follow:**\n`;
    if (Array.isArray(context.commonPatterns)) {
      for (const pattern of context.commonPatterns) {
        formatted += `${pattern}\n`;
      }
    }
    formatted += '\n';
  }

  // Format known issues (helps AI identify similar problems)
  if (context.knownIssues) {
    formatted += `**Known Issues & Debugging Locations:**\n`;
    if (Array.isArray(context.knownIssues)) {
      for (const issue of context.knownIssues) {
        formatted += `${issue}\n`;
      }
    }
    formatted += '\n';
  }

  // Format file locations (helps AI provide specific file paths)
  if (context.fileLocations) {
    formatted += `**Key File Locations:**${formatValue(context.fileLocations, 1)}\n\n`;
  }

  // Format troubleshooting
  if (context.troubleshooting) {
    formatted += `**Troubleshooting Guide:**${formatValue(context.troubleshooting, 1)}\n\n`;
  }

  return formatted;
}
