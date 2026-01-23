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
 * Extract only ESSENTIAL information from codebase context
 * Keeps prompt concise to avoid token limits and API timeouts
 */
export function formatCodebaseContextForPrompt(repo: 'frontend' | 'backend'): string {
  const context = loadRepoContext(repo);

  if (!context) {
    return `## ${repo.toUpperCase()} Context: Not available\n`;
  }

  let formatted = `## ${repo.toUpperCase()} Codebase Context\n`;

  // Basic info (concise)
  if (context.name) formatted += `Repo: ${context.name}\n`;

  // Tech stack (only framework and key libs)
  if (context.techStack) {
    const essentialTech: string[] = [];
    if (context.techStack.framework) essentialTech.push(`Framework: ${context.techStack.framework}`);
    if (context.techStack.stateManagement?.primary) essentialTech.push(`State: ${context.techStack.stateManagement.primary}`);
    if (context.techStack.routing) essentialTech.push(`Routing: ${context.techStack.routing}`);
    if (essentialTech.length > 0) {
      formatted += essentialTech.join(', ') + '\n';
    }
  }

  // Architecture pattern (one line)
  if (context.architecture?.pattern) {
    formatted += `Architecture: ${context.architecture.pattern}\n`;
  }

  // Key directories (top 8 only)
  if (context.architecture?.keyDirectories) {
    formatted += `\nKey Directories:\n`;
    const topDirs = context.architecture.keyDirectories.slice(0, 8);
    topDirs.forEach((dir: string) => {
      const shortDir = dir.length > 80 ? dir.substring(0, 77) + '...' : dir;
      formatted += `- ${shortDir}\n`;
    });
  }

  // Path aliases (essential for file references)
  if (context.pathAliases?.aliases) {
    formatted += `\nPath Aliases: `;
    const aliases = Object.keys(context.pathAliases.aliases).slice(0, 6);
    formatted += aliases.join(', ') + '\n';
  }

  // File locations (condensed)
  if (context.fileLocations) {
    formatted += `\nKey Files:\n`;
    let count = 0;
    for (const [category, files] of Object.entries(context.fileLocations)) {
      if (count >= 5) break; // Limit to 5 categories
      if (Array.isArray(files) && files.length > 0) {
        formatted += `- ${category}: ${files[0]}\n`; // Only first file per category
        count++;
      }
    }
  }

  // Known issues (top 3 most relevant)
  if (context.knownIssues && Array.isArray(context.knownIssues)) {
    formatted += `\nKnown Issues:\n`;
    context.knownIssues.slice(0, 3).forEach((issue: string) => {
      const shortIssue = issue.length > 100 ? issue.substring(0, 97) + '...' : issue;
      formatted += `- ${shortIssue}\n`;
    });
  }

  return formatted + '\n';
}
