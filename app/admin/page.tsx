'use client';

import { useState, useEffect } from 'react';
import { AIEnhancementSettings, ClaudePromptStyle } from '@/lib/types';
import { getDefaultSettings, saveSettings } from '@/lib/ai-settings';

export default function AdminPage() {
  const [settings, setSettings] = useState<AIEnhancementSettings>(getDefaultSettings());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
      }
    } catch (error) {
      // Use default settings on error
      setSettings(getDefaultSettings());
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch('/api/ai-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (response.ok) {
        // Save to localStorage client-side for immediate persistence
        const saved = saveSettings(settings);

        if (saved) {
          setSaveResult({
            success: true,
            message: 'Settings saved successfully!',
          });
        } else {
          setSaveResult({
            success: false,
            message: 'Settings validated but could not persist to localStorage',
          });
        }
      } else {
        setSaveResult({
          success: false,
          message: result.error || 'Failed to save settings',
        });
      }
    } catch (error) {
      setSaveResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromptTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSettings({
      ...settings,
      promptTemplate: {
        ...settings.promptTemplate,
        template: e.target.value,
      },
    });
  };

  const handlePromptNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      promptTemplate: {
        ...settings.promptTemplate,
        name: e.target.value,
      },
    });
  };

  const handlePromptDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSettings({
      ...settings,
      promptTemplate: {
        ...settings.promptTemplate,
        description: e.target.value,
      },
    });
  };

  const handleClaudePromptStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings({
      ...settings,
      claudePromptStyle: e.target.value as ClaudePromptStyle,
    });
  };

  const handlePriorityWeightChange = (severity: keyof typeof settings.priorityWeights, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setSettings({
        ...settings,
        priorityWeights: {
          ...settings.priorityWeights,
          [severity]: numValue,
        },
      });
    }
  };

  const handleAddLabel = (labelToAdd: string) => {
    const trimmedLabel = labelToAdd.trim();
    if (trimmedLabel && !settings.labelTaxonomy.labels.includes(trimmedLabel)) {
      setSettings({
        ...settings,
        labelTaxonomy: {
          ...settings.labelTaxonomy,
          labels: [...settings.labelTaxonomy.labels, trimmedLabel],
        },
      });
      return true;
    }
    return false;
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setSettings({
      ...settings,
      labelTaxonomy: {
        ...settings.labelTaxonomy,
        labels: settings.labelTaxonomy.labels.filter((label) => label !== labelToRemove),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">⚙️ AI Enhancement Settings</h1>
          <p className="text-gray-600">Customize how AI enhances your bug reports</p>
        </div>

        {saveResult && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              saveResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={`font-semibold ${
                saveResult.success ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {saveResult.message}
            </p>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-xl p-8 space-y-8">
          {/* Prompt Template Section */}
          <section className="border-b border-gray-200 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">📝 Prompt Template</h2>
            <p className="text-gray-600 mb-4">
              Customize the prompt used to enhance bug reports. Use {`{{variable}}`} syntax for dynamic values.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="promptName" className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  id="promptName"
                  name="promptName"
                  value={settings.promptTemplate.name}
                  onChange={handlePromptNameChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Default Bug Report Enhancement"
                />
              </div>

              <div>
                <label htmlFor="promptDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="promptDescription"
                  name="promptDescription"
                  value={settings.promptTemplate.description || ''}
                  onChange={handlePromptDescriptionChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Brief description of this template's purpose"
                />
              </div>

              <div>
                <label htmlFor="promptTemplate" className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Template *
                </label>
                <textarea
                  id="promptTemplate"
                  name="promptTemplate"
                  value={settings.promptTemplate.template}
                  onChange={handlePromptTemplateChange}
                  rows={15}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter your prompt template here..."
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Available variables: {settings.promptTemplate.variables.join(', ')}
                </p>
              </div>
            </div>
          </section>

          {/* Label Taxonomy Section */}
          <section className="border-b border-gray-200 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🏷️ Label Taxonomy</h2>
            <p className="text-gray-600 mb-4">
              Configure available labels for bug reports. These labels will be suggested by AI and used in GitHub/ClickUp.
            </p>

            <div className="space-y-4">
              {/* Add Label Input */}
              <div>
                <label htmlFor="newLabel" className="block text-sm font-medium text-gray-700 mb-2">
                  Add New Label
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="newLabel"
                    placeholder="e.g., frontend, backend, ui-bug"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.currentTarget;
                        const success = handleAddLabel(input.value);
                        if (success) {
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      const input = document.getElementById('newLabel') as HTMLInputElement;
                      const success = handleAddLabel(input.value);
                      if (success) {
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    Add Label
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Press Enter or click Add Label to add. Duplicates will be ignored.
                </p>
              </div>

              {/* Current Labels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Labels ({settings.labelTaxonomy.labels.length})
                </label>
                {settings.labelTaxonomy.labels.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                    No labels configured. Add your first label above.
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {settings.labelTaxonomy.labels.map((label) => (
                        <div
                          key={label}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700"
                        >
                          <span>{label}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLabel(label)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            aria-label={`Remove ${label}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Priority Weights Section */}
          <section className="border-b border-gray-200 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">⚖️ Priority Weights</h2>
            <p className="text-gray-600 mb-4">
              Configure how severity levels map to priority scores (1-5).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="critical" className="block text-sm font-medium text-gray-700 mb-2">
                  Critical
                </label>
                <input
                  type="number"
                  id="critical"
                  name="critical"
                  min="1"
                  max="5"
                  value={settings.priorityWeights.critical}
                  onChange={(e) => handlePriorityWeightChange('critical', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="high" className="block text-sm font-medium text-gray-700 mb-2">
                  High
                </label>
                <input
                  type="number"
                  id="high"
                  name="high"
                  min="1"
                  max="5"
                  value={settings.priorityWeights.high}
                  onChange={(e) => handlePriorityWeightChange('high', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="medium" className="block text-sm font-medium text-gray-700 mb-2">
                  Medium
                </label>
                <input
                  type="number"
                  id="medium"
                  name="medium"
                  min="1"
                  max="5"
                  value={settings.priorityWeights.medium}
                  onChange={(e) => handlePriorityWeightChange('medium', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="low" className="block text-sm font-medium text-gray-700 mb-2">
                  Low
                </label>
                <input
                  type="number"
                  id="low"
                  name="low"
                  min="1"
                  max="5"
                  value={settings.priorityWeights.low}
                  onChange={(e) => handlePriorityWeightChange('low', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </section>

          {/* Claude Code Prompt Style Section */}
          <section className="pb-2">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🤖 Claude Code Prompt Style</h2>
            <p className="text-gray-600 mb-4">
              Choose the style for Claude Code prompts generated from bug reports.
            </p>

            <div>
              <label htmlFor="claudePromptStyle" className="block text-sm font-medium text-gray-700 mb-2">
                Prompt Style
              </label>
              <select
                id="claudePromptStyle"
                name="claudePromptStyle"
                value={settings.claudePromptStyle}
                onChange={handleClaudePromptStyleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="verbose">Verbose - Detailed instructions with examples</option>
                <option value="concise">Concise - Brief, to-the-point instructions</option>
                <option value="technical">Technical - Focus on technical implementation details</option>
                <option value="beginner-friendly">Beginner-Friendly - Clear explanations for all levels</option>
              </select>
            </div>
          </section>

          {/* Submit Button */}
          <div className="pt-6 flex justify-end space-x-4">
            <button
              type="button"
              onClick={loadSettings}
              disabled={isSaving}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset to Saved
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
