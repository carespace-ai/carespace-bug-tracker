import { readFileSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { EnhancedBugReport } from './types';

interface AssignmentConfig {
  settings: {
    enableAiFallback: boolean;
    requireManualApproval: boolean;
    defaultAssigneeIfNoMatch: string | null;
  };
  categoryMappings: {
    [key: string]: {
      description: string;
      githubAssignees: string[];
      clickupAssignees: string[];
      enabled: boolean;
    };
  };
  teams: {
    [key: string]: {
      githubUsers: string[];
      clickupUsers: string[];
    };
  };
  aiSuggestionPrompt: {
    enabled: boolean;
    prompt: string;
  };
}

interface AssignmentResult {
  githubAssignees: string[];
  clickupAssignees: string[];
  assignmentMethod: 'config' | 'ai' | 'default' | 'none';
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  timeout: 30000, // 30 seconds timeout for AI suggestions
  maxRetries: 2,
});

let cachedConfig: AssignmentConfig | null = null;

/**
 * Loads the assignment configuration from the JSON file
 * @returns AssignmentConfig object
 */
function loadConfig(): AssignmentConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configPath = join(process.cwd(), 'lib', 'assignment-config.json');
    const configData = readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(configData);
    return cachedConfig;
  } catch (error) {
    console.error('Error loading assignment config:', error);
    throw new Error('Failed to load assignment configuration');
  }
}

/**
 * Uses AI to suggest assignees based on bug content
 * @param enhancedReport - The enhanced bug report
 * @param config - Assignment configuration
 * @returns Promise with suggested team name or null
 */
async function getAiSuggestion(
  enhancedReport: EnhancedBugReport,
  config: AssignmentConfig
): Promise<string | null> {
  if (!config.aiSuggestionPrompt.enabled || !config.settings.enableAiFallback) {
    return null;
  }

  const availableTeams = Object.keys(config.teams).join(', ');
  const prompt = `${config.aiSuggestionPrompt.prompt}

Bug Report:
Title: ${enhancedReport.title}
Description: ${enhancedReport.enhancedDescription}
Category: ${enhancedReport.category}
Technical Context: ${enhancedReport.technicalContext}
Priority: ${enhancedReport.priority}

Available teams: ${availableTeams}

Respond with ONLY the team name (one of: ${availableTeams}). If uncertain, respond with "none".`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return null;
    }

    const suggestion = content.text.trim().toLowerCase();

    // Validate that the suggestion is a valid team
    if (config.teams[suggestion]) {
      return suggestion;
    }

    return null;
  } catch (error) {
    console.error('Error getting AI assignment suggestion:', error);
    return null;
  }
}

/**
 * Determines the appropriate assignees for a bug report based on category and optional AI analysis
 * @param enhancedReport - The enhanced bug report
 * @param useAi - Whether to use AI for assignment suggestions (default: false)
 * @returns Promise with assignment result containing GitHub and ClickUp assignees
 */
export async function determineAssignees(
  enhancedReport: EnhancedBugReport,
  useAi: boolean = false
): Promise<AssignmentResult> {
  try {
    const config = loadConfig();
    const category = enhancedReport.category;

    // First, try category-based assignment
    if (config.categoryMappings[category]) {
      const mapping = config.categoryMappings[category];

      if (mapping.enabled && (mapping.githubAssignees.length > 0 || mapping.clickupAssignees.length > 0)) {
        return {
          githubAssignees: mapping.githubAssignees,
          clickupAssignees: mapping.clickupAssignees,
          assignmentMethod: 'config'
        };
      }
    }

    // If category mapping is disabled or empty, try AI suggestion
    if (useAi && config.settings.enableAiFallback) {
      const aiTeamSuggestion = await getAiSuggestion(enhancedReport, config);

      if (aiTeamSuggestion && config.teams[aiTeamSuggestion]) {
        const team = config.teams[aiTeamSuggestion];
        return {
          githubAssignees: team.githubUsers,
          clickupAssignees: team.clickupUsers,
          assignmentMethod: 'ai'
        };
      }
    }

    // Fall back to default assignee if configured
    if (config.settings.defaultAssigneeIfNoMatch) {
      return {
        githubAssignees: [config.settings.defaultAssigneeIfNoMatch],
        clickupAssignees: [],
        assignmentMethod: 'default'
      };
    }

    // No assignment possible
    return {
      githubAssignees: [],
      clickupAssignees: [],
      assignmentMethod: 'none'
    };
  } catch (error) {
    console.error('Error determining assignees:', error);
    // Return empty assignees on error to not block bug submission
    return {
      githubAssignees: [],
      clickupAssignees: [],
      assignmentMethod: 'none'
    };
  }
}
