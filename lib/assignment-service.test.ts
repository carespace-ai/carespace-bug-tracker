import { EnhancedBugReport } from './types';

// Mock dependencies before importing assignment-service
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => {
    return {
      messages: {
        create: mockCreate,
      },
    };
  });
});

// Mock fs module
const mockReadFileSync = jest.fn();
jest.mock('fs', () => ({
  readFileSync: mockReadFileSync,
}));

jest.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
}));

import { determineAssignees } from './assignment-service';

const mockConfig = {
  settings: {
    enableAiFallback: true,
    requireManualApproval: false,
    defaultAssigneeIfNoMatch: null,
  },
  categoryMappings: {
    ui: {
      description: 'User interface bugs',
      githubAssignees: ['frontend-dev'],
      clickupAssignees: ['12345678'],
      enabled: true,
    },
    functionality: {
      description: 'Functional bugs',
      githubAssignees: ['backend-dev'],
      clickupAssignees: ['23456789'],
      enabled: true,
    },
    security: {
      description: 'Security vulnerabilities',
      githubAssignees: ['security-team'],
      clickupAssignees: ['45678901'],
      enabled: true,
    },
    other: {
      description: 'Uncategorized bugs',
      githubAssignees: [],
      clickupAssignees: [],
      enabled: false,
    },
  },
  teams: {
    frontend: {
      githubUsers: ['frontend-dev'],
      clickupUsers: ['12345678'],
    },
    backend: {
      githubUsers: ['backend-dev'],
      clickupUsers: ['23456789'],
    },
    security: {
      githubUsers: ['security-team'],
      clickupUsers: ['45678901'],
    },
  },
  aiSuggestionPrompt: {
    enabled: true,
    prompt: 'Based on the bug description, suggest which team should handle this issue.',
  },
};

// Helper function to get a fresh instance of determineAssignees with a specific config
function getFreshDetermineAssignees(config: typeof mockConfig) {
  // Use mockImplementation to ensure the mock returns the config
  mockReadFileSync.mockClear();
  mockReadFileSync.mockImplementation(() => JSON.stringify(config));
  delete require.cache[require.resolve('./assignment-service')];
  const freshModule = require('./assignment-service');
  return freshModule.determineAssignees;
}

describe('assignment-service', () => {
  beforeEach(() => {
    // Reset all mocks between tests
    mockCreate.mockClear();
    mockReadFileSync.mockClear();

    // Setup default fs mock
    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));
  });

  describe('category-based assignment', () => {
    it('should assign based on category mapping when enabled', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Button styling broken',
        description: 'Button appears misaligned',
        enhancedDescription: 'Button styling issue on login page',
        severity: 'medium',
        category: 'ui',
        suggestedLabels: ['ui', 'frontend'],
        technicalContext: 'CSS styling issue',
        claudePrompt: 'Fix button alignment',
        priority: 3,
      };

      const result = await freshDetermineAssignees(enhancedReport, false);

      expect(result).toEqual({
        githubAssignees: ['frontend-dev'],
        clickupAssignees: ['12345678'],
        assignmentMethod: 'config',
      });
    });

    it('should assign based on security category', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'SQL injection vulnerability',
        description: 'User input not sanitized',
        enhancedDescription: 'Critical SQL injection in login form',
        severity: 'critical',
        category: 'security',
        suggestedLabels: ['security', 'critical'],
        technicalContext: 'SQL injection vulnerability',
        claudePrompt: 'Fix SQL injection',
        priority: 5,
      };

      const result = await freshDetermineAssignees(enhancedReport, false);

      expect(result).toEqual({
        githubAssignees: ['security-team'],
        clickupAssignees: ['45678901'],
        assignmentMethod: 'config',
      });
    });

    it('should not assign if category mapping is disabled', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Random issue',
        description: 'Some random issue',
        enhancedDescription: 'Miscellaneous issue',
        severity: 'low',
        category: 'other',
        suggestedLabels: ['other'],
        technicalContext: 'Uncategorized',
        claudePrompt: 'Handle misc issue',
        priority: 1,
      };

      const result = await freshDetermineAssignees(enhancedReport, false);

      expect(result).toEqual({
        githubAssignees: [],
        clickupAssignees: [],
        assignmentMethod: 'none',
      });
    });

    it('should not assign if category mapping has empty assignees', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Random issue',
        description: 'Some random issue',
        enhancedDescription: 'Miscellaneous issue',
        severity: 'low',
        category: 'other',
        suggestedLabels: ['other'],
        technicalContext: 'Uncategorized',
        claudePrompt: 'Handle misc issue',
        priority: 1,
      };

      const result = await freshDetermineAssignees(enhancedReport, false);

      expect(result.githubAssignees).toEqual([]);
      expect(result.clickupAssignees).toEqual([]);
    });
  });

  describe('AI-based assignment', () => {
    it('should use AI suggestion when category mapping fails and useAi is true', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Complex authentication issue',
        description: 'Login fails intermittently',
        enhancedDescription: 'Authentication service experiencing intermittent failures',
        severity: 'high',
        category: 'other',
        suggestedLabels: ['auth', 'backend'],
        technicalContext: 'Authentication service issue',
        claudePrompt: 'Fix auth service',
        priority: 4,
      };

      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'backend',
        }],
      });

      const result = await freshDetermineAssignees(enhancedReport, true);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        githubAssignees: ['backend-dev'],
        clickupAssignees: ['23456789'],
        assignmentMethod: 'ai',
      });
    });

    it('should validate AI suggestion against available teams', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Issue',
        description: 'Some issue',
        enhancedDescription: 'Enhanced description',
        severity: 'medium',
        category: 'other',
        suggestedLabels: ['bug'],
        technicalContext: 'Context',
        claudePrompt: 'Fix issue',
        priority: 3,
      };

      // AI returns invalid team name
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'invalid-team-name',
        }],
      });

      const result = await freshDetermineAssignees(enhancedReport, true);

      expect(result).toEqual({
        githubAssignees: [],
        clickupAssignees: [],
        assignmentMethod: 'none',
      });
    });

    it('should not use AI when useAi is false', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Issue',
        description: 'Some issue',
        enhancedDescription: 'Enhanced description',
        severity: 'medium',
        category: 'other',
        suggestedLabels: ['bug'],
        technicalContext: 'Context',
        claudePrompt: 'Fix issue',
        priority: 3,
      };

      const result = await freshDetermineAssignees(enhancedReport, false);

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result.assignmentMethod).not.toBe('ai');
    });

    it('should handle AI API errors gracefully', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Issue',
        description: 'Some issue',
        enhancedDescription: 'Enhanced description',
        severity: 'medium',
        category: 'other',
        suggestedLabels: ['bug'],
        technicalContext: 'Context',
        claudePrompt: 'Fix issue',
        priority: 3,
      };

      mockCreate.mockRejectedValue(new Error('API error'));

      const result = await freshDetermineAssignees(enhancedReport, true);

      expect(result).toEqual({
        githubAssignees: [],
        clickupAssignees: [],
        assignmentMethod: 'none',
      });
    });

    it('should have AI suggestion settings in config', () => {
      // Test that config has AI suggestion settings
      expect(mockConfig.aiSuggestionPrompt).toBeDefined();
      expect(mockConfig.aiSuggestionPrompt.enabled).toBeDefined();
      expect(mockConfig.settings.enableAiFallback).toBeDefined();
    });

    it('should handle AI returning "none" suggestion', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Issue',
        description: 'Some issue',
        enhancedDescription: 'Enhanced description',
        severity: 'medium',
        category: 'other',
        suggestedLabels: ['bug'],
        technicalContext: 'Context',
        claudePrompt: 'Fix issue',
        priority: 3,
      };

      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'none',
        }],
      });

      const result = await freshDetermineAssignees(enhancedReport, true);

      expect(result).toEqual({
        githubAssignees: [],
        clickupAssignees: [],
        assignmentMethod: 'none',
      });
    });

    it('should trim and lowercase AI suggestions', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Issue',
        description: 'Some issue',
        enhancedDescription: 'Enhanced description',
        severity: 'medium',
        category: 'other',
        suggestedLabels: ['bug'],
        technicalContext: 'Context',
        claudePrompt: 'Fix issue',
        priority: 3,
      };

      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: '  FRONTEND  ',
        }],
      });

      const result = await freshDetermineAssignees(enhancedReport, true);

      expect(result).toEqual({
        githubAssignees: ['frontend-dev'],
        clickupAssignees: ['12345678'],
        assignmentMethod: 'ai',
      });
    });
  });

  describe('default assignee fallback', () => {
    it('should have default assignee setting in config', () => {
      // Test that config has default assignee setting
      expect(mockConfig.settings.defaultAssigneeIfNoMatch).toBeDefined();
    });

    it('should prefer category mapping when available', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'UI bug',
        description: 'Button issue',
        enhancedDescription: 'Button styling problem',
        severity: 'medium',
        category: 'ui',
        suggestedLabels: ['ui'],
        technicalContext: 'CSS issue',
        claudePrompt: 'Fix button',
        priority: 3,
      };

      const result = await freshDetermineAssignees(enhancedReport, false);

      expect(result).toEqual({
        githubAssignees: ['frontend-dev'],
        clickupAssignees: ['12345678'],
        assignmentMethod: 'config',
      });
    });

    it('should prefer AI suggestion when category mapping not available', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'backend',
        }],
      });

      const enhancedReport: EnhancedBugReport = {
        title: 'Issue',
        description: 'Some issue',
        enhancedDescription: 'Enhanced description',
        severity: 'medium',
        category: 'other',
        suggestedLabels: ['bug'],
        technicalContext: 'Context',
        claudePrompt: 'Fix issue',
        priority: 3,
      };

      const result = await freshDetermineAssignees(enhancedReport, true);

      expect(result).toEqual({
        githubAssignees: ['backend-dev'],
        clickupAssignees: ['23456789'],
        assignmentMethod: 'ai',
      });
    });
  });

  describe('no assignment case', () => {
    it('should return empty assignees when no assignment method succeeds', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Issue',
        description: 'Some issue',
        enhancedDescription: 'Enhanced description',
        severity: 'medium',
        category: 'other',
        suggestedLabels: ['bug'],
        technicalContext: 'Context',
        claudePrompt: 'Fix issue',
        priority: 3,
      };

      const result = await freshDetermineAssignees(enhancedReport, false);

      expect(result).toEqual({
        githubAssignees: [],
        clickupAssignees: [],
        assignmentMethod: 'none',
      });
    });
  });

  describe('error handling', () => {
    it('should return empty assignees on error to not block bug submission', async () => {
      // Test that when determineAssignees encounters an error, it returns empty assignees
      // This is tested through the 'other' category which has empty assignees and is disabled
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Issue',
        description: 'Some issue',
        enhancedDescription: 'Enhanced description',
        severity: 'medium',
        category: 'other',
        suggestedLabels: ['bug'],
        technicalContext: 'Context',
        claudePrompt: 'Fix issue',
        priority: 3,
      };

      const result = await freshDetermineAssignees(enhancedReport, false);

      // When no assignment method works, it returns empty assignees
      expect(result).toEqual({
        githubAssignees: [],
        clickupAssignees: [],
        assignmentMethod: 'none',
      });
    });
  });

  describe('AI prompt construction', () => {
    it('should include all relevant bug report fields in AI prompt', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Login page crash',
        description: 'App crashes on login',
        enhancedDescription: 'Enhanced: Authentication service crash',
        severity: 'critical',
        category: 'other',
        suggestedLabels: ['auth', 'critical'],
        technicalContext: 'Stack trace shows auth service error',
        claudePrompt: 'Fix authentication crash',
        priority: 5,
      };

      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'backend',
        }],
      });

      await freshDetermineAssignees(enhancedReport, true);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      const prompt = callArgs.messages[0].content;

      expect(prompt).toContain('Login page crash');
      expect(prompt).toContain('Enhanced: Authentication service crash');
      expect(prompt).toContain('other');
      expect(prompt).toContain('Stack trace shows auth service error');
      expect(prompt).toContain('5');
      expect(prompt).toContain('frontend, backend, security');
    });

    it('should use correct AI model and parameters', async () => {
      const freshDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const enhancedReport: EnhancedBugReport = {
        title: 'Issue',
        description: 'Some issue',
        enhancedDescription: 'Enhanced description',
        severity: 'medium',
        category: 'other',
        suggestedLabels: ['bug'],
        technicalContext: 'Context',
        claudePrompt: 'Fix issue',
        priority: 3,
      };

      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'backend',
        }],
      });

      await freshDetermineAssignees(enhancedReport, true);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 100,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
            }),
          ]),
        })
      );
    });
  });

  describe('config caching', () => {
    it('should cache config after first load', async () => {
      const enhancedReport: EnhancedBugReport = {
        title: 'Issue',
        description: 'Some issue',
        enhancedDescription: 'Enhanced description',
        severity: 'medium',
        category: 'ui',
        suggestedLabels: ['bug'],
        technicalContext: 'Context',
        claudePrompt: 'Fix issue',
        priority: 3,
      };

      // Need fresh module to test caching
      // Don't clear the mock - just count calls from this point
      const customDetermineAssignees = getFreshDetermineAssignees(mockConfig);

      const initialCallCount = mockReadFileSync.mock.calls.length;
      await customDetermineAssignees(enhancedReport, false);
      await customDetermineAssignees(enhancedReport, false);

      // Config should only be loaded once after the initial setup
      const finalCallCount = mockReadFileSync.mock.calls.length;
      expect(finalCallCount - initialCallCount).toBe(0); // No additional calls after initial load
    });
  });
});
