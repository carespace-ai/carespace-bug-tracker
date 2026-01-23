import { readFileSync } from 'fs';
import { join } from 'path';

interface CodebaseContext {
  frontend: CodebaseInfo;
  backend: CodebaseInfo;
  sharedContext: SharedContext;
}

interface CodebaseInfo {
  name: string;
  description: string;
  techStack: Record<string, string>;
  architecture: {
    pattern: string;
    keyDirectories: string[];
  };
  keyFeatures: string[];
  commonPatterns: string[];
  integrations: string[];
  knownIssues: string[];
}

interface SharedContext {
  apiConventions: Record<string, string>;
  deploymentInfo: Record<string, string>;
  developmentWorkflow: Record<string, string>;
}

let cachedContext: CodebaseContext | null = null;

/**
 * Load codebase context from configuration file
 * Caches the result for performance
 */
export function loadCodebaseContext(): CodebaseContext {
  if (cachedContext) {
    return cachedContext;
  }

  try {
    const contextPath = join(process.cwd(), 'codebase-context.json');
    const fileContent = readFileSync(contextPath, 'utf-8');
    cachedContext = JSON.parse(fileContent) as CodebaseContext;
    return cachedContext;
  } catch (error) {
    console.warn('Could not load codebase-context.json, using default empty context');

    // Return empty context if file doesn't exist
    return {
      frontend: createEmptyCodebaseInfo('carespace-frontend'),
      backend: createEmptyCodebaseInfo('carespace-backend'),
      sharedContext: {
        apiConventions: {},
        deploymentInfo: {},
        developmentWorkflow: {}
      }
    };
  }
}

function createEmptyCodebaseInfo(name: string): CodebaseInfo {
  return {
    name,
    description: 'No context provided',
    techStack: {},
    architecture: {
      pattern: 'Not specified',
      keyDirectories: []
    },
    keyFeatures: [],
    commonPatterns: [],
    integrations: [],
    knownIssues: []
  };
}

/**
 * Format codebase context for AI prompt
 * @param repo - Which repo context to format ('frontend' or 'backend')
 */
export function formatCodebaseContextForPrompt(repo: 'frontend' | 'backend'): string {
  const context = loadCodebaseContext();
  const repoContext = context[repo];
  const shared = context.sharedContext;

  // Build formatted context string
  let formatted = `## ${repo.toUpperCase()} Codebase Context\n\n`;

  formatted += `**Repository:** ${repoContext.name}\n`;
  formatted += `**Description:** ${repoContext.description}\n\n`;

  // Tech Stack
  if (Object.keys(repoContext.techStack).length > 0) {
    formatted += `**Tech Stack:**\n`;
    for (const [key, value] of Object.entries(repoContext.techStack)) {
      formatted += `- ${key}: ${value}\n`;
    }
    formatted += '\n';
  }

  // Architecture
  formatted += `**Architecture Pattern:** ${repoContext.architecture.pattern}\n\n`;

  if (repoContext.architecture.keyDirectories.length > 0) {
    formatted += `**Key Directories:**\n`;
    for (const dir of repoContext.architecture.keyDirectories) {
      formatted += `- ${dir}\n`;
    }
    formatted += '\n';
  }

  // Key Features
  if (repoContext.keyFeatures.length > 0) {
    formatted += `**Key Features:**\n`;
    for (const feature of repoContext.keyFeatures) {
      formatted += `- ${feature}\n`;
    }
    formatted += '\n';
  }

  // Common Patterns
  if (repoContext.commonPatterns.length > 0) {
    formatted += `**Common Patterns:**\n`;
    for (const pattern of repoContext.commonPatterns) {
      formatted += `- ${pattern}\n`;
    }
    formatted += '\n';
  }

  // Integrations
  if (repoContext.integrations.length > 0) {
    formatted += `**Integrations:**\n`;
    for (const integration of repoContext.integrations) {
      formatted += `- ${integration}\n`;
    }
    formatted += '\n';
  }

  // Known Issues
  if (repoContext.knownIssues.length > 0) {
    formatted += `**Known Issues to Check:**\n`;
    for (const issue of repoContext.knownIssues) {
      formatted += `- ${issue}\n`;
    }
    formatted += '\n';
  }

  // Shared Context
  if (Object.keys(shared.apiConventions).length > 0) {
    formatted += `**API Conventions:**\n`;
    for (const [key, value] of Object.entries(shared.apiConventions)) {
      formatted += `- ${key}: ${value}\n`;
    }
    formatted += '\n';
  }

  return formatted;
}
