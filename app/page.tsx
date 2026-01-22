'use client';

import { useState } from 'react';
import { BugReport } from '@/lib/types';

export default function Home() {
  const [formData, setFormData] = useState<Partial<BugReport>>({
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    severity: 'medium',
    category: 'functionality',
    userEmail: '',
    environment: '',
    browserInfo: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch('/api/submit-bug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitResult({
          success: true,
          message: 'Bug report submitted successfully!',
          data: result.data,
        });
        // Reset form
        setFormData({
          title: '',
          description: '',
          stepsToReproduce: '',
          expectedBehavior: '',
          actualBehavior: '',
          severity: 'medium',
          category: 'functionality',
          userEmail: '',
          environment: '',
          browserInfo: '',
        });
      } else {
        setSubmitResult({
          success: false,
          message: result.error || 'Failed to submit bug report',
        });
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getSeverityColorClasses = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-green-50 border-green-300 text-green-900';
      case 'medium':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      case 'high':
        return 'bg-orange-50 border-orange-300 text-orange-900';
      case 'critical':
        return 'bg-red-50 border-red-300 text-red-900';
      default:
        return 'border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🐛 Carespace Bug Tracker</h1>
          <p className="text-gray-600">Report bugs and we\'ll process them automatically</p>
        </div>

        {submitResult && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              submitResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={`font-semibold ${
                submitResult.success ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {submitResult.message}
            </p>
            {submitResult.success && submitResult.data && (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-green-700">
                  <strong>GitHub Issue:</strong>{' '}
                  <a
                    href={submitResult.data.githubIssue}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-green-900"
                  >
                    View Issue
                  </a>
                </p>
                <p className="text-green-700">
                  <strong>ClickUp Task:</strong>{' '}
                  <a
                    href={submitResult.data.clickupTask}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-green-900"
                  >
                    View Task
                  </a>
                </p>
                <p className="text-green-700">
                  <strong>Priority:</strong> {submitResult.data.enhancedReport.priority}/5
                </p>
                <p className="text-green-700">
                  <strong>Labels:</strong> {submitResult.data.enhancedReport.labels.join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg p-8 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Bug Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Brief description of the bug"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Detailed description of the bug"
            />
          </div>

          {/* Steps to Reproduce */}
          <div>
            <label htmlFor="stepsToReproduce" className="block text-sm font-medium text-gray-700 mb-2">
              Steps to Reproduce
            </label>
            <textarea
              id="stepsToReproduce"
              name="stepsToReproduce"
              value={formData.stepsToReproduce}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="1. Go to...\n2. Click on...\n3. See error"
            />
          </div>

          {/* Expected vs Actual Behavior */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="expectedBehavior" className="block text-sm font-medium text-gray-700 mb-2">
                Expected Behavior
              </label>
              <textarea
                id="expectedBehavior"
                name="expectedBehavior"
                value={formData.expectedBehavior}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="What should happen?"
              />
            </div>
            <div>
              <label htmlFor="actualBehavior" className="block text-sm font-medium text-gray-700 mb-2">
                Actual Behavior
              </label>
              <textarea
                id="actualBehavior"
                name="actualBehavior"
                value={formData.actualBehavior}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="What actually happens?"
              />
            </div>
          </div>

          {/* Severity and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-2">
                Severity *
              </label>
              <select
                id="severity"
                name="severity"
                required
                value={formData.severity}
                onChange={handleChange}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium ${getSeverityColorClasses(formData.severity || 'medium')}`}
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="critical">🔴 Critical</option>
              </select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="ui">UI</option>
                <option value="functionality">Functionality</option>
                <option value="performance">Performance</option>
                <option value="security">Security</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Contact and Environment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Your Email
              </label>
              <input
                type="email"
                id="userEmail"
                name="userEmail"
                value={formData.userEmail}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="environment" className="block text-sm font-medium text-gray-700 mb-2">
                Environment
              </label>
              <input
                type="text"
                id="environment"
                name="environment"
                value={formData.environment}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Production, Staging, etc."
              />
            </div>
          </div>

          {/* Browser Info */}
          <div>
            <label htmlFor="browserInfo" className="block text-sm font-medium text-gray-700 mb-2">
              Browser Information
            </label>
            <input
              type="text"
              id="browserInfo"
              name="browserInfo"
              value={formData.browserInfo}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Chrome 120, Safari 17, etc."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Submit Bug Report'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Your bug report will be automatically:</p>
          <ul className="mt-2 space-y-1">
            <li>✨ Enhanced with AI analysis</li>
            <li>📝 Created as a GitHub issue</li>
            <li>📊 Logged in ClickUp</li>
            <li>🤖 Prepared with Claude Code prompts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
