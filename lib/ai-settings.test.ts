import { AIEnhancementSettings } from './types';

// Mock localStorage
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockLocalStorage = {
  getItem: mockGetItem,
  setItem: mockSetItem,
};

// Mock window object
Object.defineProperty(global, 'window', {
  value: {},
  writable: true,
});

// Set up localStorage mock before imports
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

import { getDefaultSettings, loadSettings, saveSettings } from './ai-settings';

describe('ai-settings', () => {
  beforeEach(() => {
    // Reset mocks between tests
    mockGetItem.mockReset();
    mockSetItem.mockReset();
  });

  describe('getDefaultSettings', () => {
    it('should return default settings with all required fields', () => {
      const settings = getDefaultSettings();

      expect(settings).toHaveProperty('promptTemplate');
      expect(settings).toHaveProperty('labelTaxonomy');
      expect(settings).toHaveProperty('priorityWeights');
      expect(settings).toHaveProperty('claudePromptStyle');
    });

    it('should return valid prompt template structure', () => {
      const settings = getDefaultSettings();

      expect(settings.promptTemplate).toHaveProperty('name');
      expect(settings.promptTemplate).toHaveProperty('template');
      expect(settings.promptTemplate).toHaveProperty('variables');
      expect(settings.promptTemplate).toHaveProperty('description');
      expect(Array.isArray(settings.promptTemplate.variables)).toBe(true);
    });

    it('should return valid label taxonomy structure', () => {
      const settings = getDefaultSettings();

      expect(settings.labelTaxonomy).toHaveProperty('labels');
      expect(settings.labelTaxonomy).toHaveProperty('autoSuggestionRules');
      expect(Array.isArray(settings.labelTaxonomy.labels)).toBe(true);
      expect(Array.isArray(settings.labelTaxonomy.autoSuggestionRules)).toBe(true);
    });

    it('should return valid priority weights structure', () => {
      const settings = getDefaultSettings();

      expect(settings.priorityWeights).toHaveProperty('critical');
      expect(settings.priorityWeights).toHaveProperty('high');
      expect(settings.priorityWeights).toHaveProperty('medium');
      expect(settings.priorityWeights).toHaveProperty('low');
      expect(typeof settings.priorityWeights.critical).toBe('number');
      expect(typeof settings.priorityWeights.high).toBe('number');
      expect(typeof settings.priorityWeights.medium).toBe('number');
      expect(typeof settings.priorityWeights.low).toBe('number');
    });

    it('should return valid claude prompt style', () => {
      const settings = getDefaultSettings();

      expect(typeof settings.claudePromptStyle).toBe('string');
      expect(['technical', 'conversational', 'concise']).toContain(settings.claudePromptStyle);
    });

    it('should include essential labels in taxonomy', () => {
      const settings = getDefaultSettings();

      expect(settings.labelTaxonomy.labels).toContain('bug');
      expect(settings.labelTaxonomy.labels).toContain('critical');
      expect(settings.labelTaxonomy.labels).toContain('high');
      expect(settings.labelTaxonomy.labels).toContain('medium');
      expect(settings.labelTaxonomy.labels).toContain('low');
    });

    it('should have auto-suggestion rules with valid structure', () => {
      const settings = getDefaultSettings();

      settings.labelTaxonomy.autoSuggestionRules.forEach(rule => {
        expect(rule).toHaveProperty('keywords');
        expect(rule).toHaveProperty('suggestedLabel');
        expect(Array.isArray(rule.keywords)).toBe(true);
        expect(typeof rule.suggestedLabel).toBe('string');
      });
    });
  });

  describe('loadSettings', () => {
    it('should return default settings when no stored data exists', () => {
      mockGetItem.mockReturnValue(null);

      const settings = loadSettings();

      expect(mockGetItem).toHaveBeenCalledWith('ai-enhancement-settings');
      expect(settings).toEqual(getDefaultSettings());
    });

    it('should load valid stored settings', () => {
      const validSettings: AIEnhancementSettings = {
        promptTemplate: {
          name: 'Custom Template',
          template: 'Custom template content',
          variables: ['title', 'description'],
          description: 'Custom description'
        },
        labelTaxonomy: {
          labels: ['custom-label'],
          autoSuggestionRules: []
        },
        priorityWeights: {
          critical: 10,
          high: 8,
          medium: 5,
          low: 2
        },
        claudePromptStyle: 'conversational'
      };

      mockGetItem.mockReturnValue(JSON.stringify(validSettings));

      const settings = loadSettings();

      expect(mockGetItem).toHaveBeenCalledWith('ai-enhancement-settings');
      expect(settings).toEqual(validSettings);
    });

    it('should return default settings on invalid JSON', () => {
      mockGetItem.mockReturnValue('invalid json {{{');

      const settings = loadSettings();

      expect(settings).toEqual(getDefaultSettings());
    });

    it('should return default settings when stored data is missing promptTemplate', () => {
      const invalidSettings = {
        labelTaxonomy: {
          labels: ['test'],
          autoSuggestionRules: []
        },
        priorityWeights: {
          critical: 5,
          high: 4,
          medium: 3,
          low: 2
        },
        claudePromptStyle: 'technical'
      };

      mockGetItem.mockReturnValue(JSON.stringify(invalidSettings));

      const settings = loadSettings();

      expect(settings).toEqual(getDefaultSettings());
    });

    it('should return default settings when stored data is missing labelTaxonomy', () => {
      const invalidSettings = {
        promptTemplate: {
          name: 'Test',
          template: 'Test',
          variables: [],
          description: 'Test'
        },
        priorityWeights: {
          critical: 5,
          high: 4,
          medium: 3,
          low: 2
        },
        claudePromptStyle: 'technical'
      };

      mockGetItem.mockReturnValue(JSON.stringify(invalidSettings));

      const settings = loadSettings();

      expect(settings).toEqual(getDefaultSettings());
    });

    it('should return default settings when stored data is missing priorityWeights', () => {
      const invalidSettings = {
        promptTemplate: {
          name: 'Test',
          template: 'Test',
          variables: [],
          description: 'Test'
        },
        labelTaxonomy: {
          labels: ['test'],
          autoSuggestionRules: []
        },
        claudePromptStyle: 'technical'
      };

      mockGetItem.mockReturnValue(JSON.stringify(invalidSettings));

      const settings = loadSettings();

      expect(settings).toEqual(getDefaultSettings());
    });

    it('should return default settings when stored data is missing claudePromptStyle', () => {
      const invalidSettings = {
        promptTemplate: {
          name: 'Test',
          template: 'Test',
          variables: [],
          description: 'Test'
        },
        labelTaxonomy: {
          labels: ['test'],
          autoSuggestionRules: []
        },
        priorityWeights: {
          critical: 5,
          high: 4,
          medium: 3,
          low: 2
        }
      };

      mockGetItem.mockReturnValue(JSON.stringify(invalidSettings));

      const settings = loadSettings();

      expect(settings).toEqual(getDefaultSettings());
    });

    it('should handle localStorage access errors gracefully', () => {
      mockGetItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const settings = loadSettings();

      expect(settings).toEqual(getDefaultSettings());
    });

    it('should return default settings in non-browser environment', () => {
      // Temporarily remove localStorage
      const originalLocalStorage = global.localStorage;
      // @ts-ignore
      delete global.localStorage;

      const settings = loadSettings();

      expect(settings).toEqual(getDefaultSettings());

      // Restore localStorage
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe('saveSettings', () => {
    it('should save valid settings to localStorage', () => {
      const settings: AIEnhancementSettings = {
        promptTemplate: {
          name: 'Test Template',
          template: 'Test content',
          variables: ['title'],
          description: 'Test description'
        },
        labelTaxonomy: {
          labels: ['test-label'],
          autoSuggestionRules: []
        },
        priorityWeights: {
          critical: 5,
          high: 4,
          medium: 3,
          low: 2
        },
        claudePromptStyle: 'technical'
      };

      const result = saveSettings(settings);

      expect(result).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith('ai-enhancement-settings', JSON.stringify(settings));
    });

    it('should return false on storage errors', () => {
      mockSetItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const settings = getDefaultSettings();
      const result = saveSettings(settings);

      expect(result).toBe(false);
    });

    it('should return false in non-browser environment', () => {
      // Temporarily remove localStorage and window
      const originalLocalStorage = global.localStorage;
      const originalWindow = global.window;
      // @ts-ignore - Set to undefined to simulate non-browser environment
      global.localStorage = undefined;
      // @ts-ignore
      global.window = undefined;

      const settings = getDefaultSettings();
      const result = saveSettings(settings);

      expect(result).toBe(false);

      // Restore localStorage and window
      global.localStorage = originalLocalStorage;
      global.window = originalWindow;
    });

    it('should handle complex settings objects correctly', () => {
      const complexSettings: AIEnhancementSettings = {
        promptTemplate: {
          name: 'Complex Template',
          template: 'Template with {{var1}} and {{var2}}',
          variables: ['var1', 'var2', 'var3'],
          description: 'A complex template with multiple variables'
        },
        labelTaxonomy: {
          labels: ['label1', 'label2', 'label3', 'label4', 'label5'],
          autoSuggestionRules: [
            {
              keywords: ['keyword1', 'keyword2', 'keyword3'],
              suggestedLabel: 'label1'
            },
            {
              keywords: ['keyword4', 'keyword5'],
              suggestedLabel: 'label2'
            }
          ]
        },
        priorityWeights: {
          critical: 10,
          high: 7,
          medium: 4,
          low: 1
        },
        claudePromptStyle: 'technical'
      };

      const result = saveSettings(complexSettings);

      expect(result).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith('ai-enhancement-settings', JSON.stringify(complexSettings));

      // Verify serialization is correct
      const serialized = mockSetItem.mock.calls[0][1];
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual(complexSettings);
    });
  });

  describe('settings persistence', () => {
    it('should maintain settings across save and load cycle', () => {
      const customSettings: AIEnhancementSettings = {
        promptTemplate: {
          name: 'Persistence Test',
          template: 'Test template',
          variables: ['test'],
          description: 'Test'
        },
        labelTaxonomy: {
          labels: ['persist-label'],
          autoSuggestionRules: [{
            keywords: ['persist'],
            suggestedLabel: 'persist-label'
          }]
        },
        priorityWeights: {
          critical: 9,
          high: 6,
          medium: 4,
          low: 1
        },
        claudePromptStyle: 'concise'
      };

      // Save settings
      saveSettings(customSettings);

      // Mock the return value for the next load
      const savedData = mockSetItem.mock.calls[0][1];
      mockGetItem.mockReturnValue(savedData);

      // Load settings
      const loadedSettings = loadSettings();

      expect(loadedSettings).toEqual(customSettings);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string in localStorage', () => {
      mockGetItem.mockReturnValue('');

      const settings = loadSettings();

      expect(settings).toEqual(getDefaultSettings());
    });

    it('should handle null object in stored data', () => {
      mockGetItem.mockReturnValue('null');

      const settings = loadSettings();

      expect(settings).toEqual(getDefaultSettings());
    });

    it('should handle array instead of object in stored data', () => {
      mockGetItem.mockReturnValue('[]');

      const settings = loadSettings();

      expect(settings).toEqual(getDefaultSettings());
    });

    it('should handle string instead of object in stored data', () => {
      mockGetItem.mockReturnValue('"just a string"');

      const settings = loadSettings();

      expect(settings).toEqual(getDefaultSettings());
    });

    it('should handle number instead of object in stored data', () => {
      mockGetItem.mockReturnValue('12345');

      const settings = loadSettings();

      expect(settings).toEqual(getDefaultSettings());
    });
  });
});
