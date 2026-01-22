'use client';

import { useState, useEffect } from 'react';
import { BugReport, SubmitBugResponse } from '@/lib/types';
import { detectBrowserInfo } from '@/lib/browser-detection';
import { useFieldValidation } from '@/lib/hooks/useFieldValidation';

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

  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitBugResponse | null>(null);

  // Initialize field validation hook for real-time validation
  const {
    validateField,
    getFieldError,
    markFieldTouched,
    isFieldValid,
    touchedFields,
  } = useFieldValidation();

  useEffect(() => {
    const browserInfo = detectBrowserInfo();
    setFormData((prev) => ({
      ...prev,
      browserInfo,
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      // Create FormData object
      const formDataToSend = new FormData();

      // Append all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formDataToSend.append(key, value.toString());
        }
      });

      // Append all file attachments
      attachments.forEach((file) => {
        formDataToSend.append('attachments', file);
      });

      const response = await fetch('/api/submit-bug', {
        method: 'POST',
        // Do not set Content-Type header - browser will set it automatically with the correct boundary
        body: formDataToSend,
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
        setAttachments([]);
      } else {
        setSubmitResult({
          success: false,
          message: result.error || 'Failed to submit bug report',
        });
      }
    } catch {
      setSubmitResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Validate field in real-time if it has been touched
    if (touchedFields[name]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    markFieldTouched(name);
    validateField(name, value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'text/plain',        // For .txt and .log files
      'application/pdf',   // For PDF documents
      'application/json',  // For JSON log files
    ];

    fileArray.forEach((file) => {
      if (file.size > maxFileSize) {
        errors.push(`${file.name} is too large (max 10MB)`);
      } else if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name} has unsupported file type`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setSubmitResult({
        success: false,
        message: errors.join(', '),
      });
    }

    setAttachments((prev) => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="page-container min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img
              src="/brand/logo/logo-horizontal-color-light.svg"
              alt="Carespace Logo"
              className="h-16 w-auto"
            />
          </div>
          <h1 className="header-title text-4xl font-bold mb-2">Bug Tracker</h1>
          <p className="text-[rgba(0,0,0,0.55)]">Report bugs and we'll process them automatically with AI</p>
        </div>

        {submitResult && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              submitResult.success
                ? 'border-2'
                : 'bg-red-50 border border-red-200'
            }`}
            style={submitResult.success ? {
              backgroundColor: '#f3e8ff',
              borderColor: '#9F25F4'
            } : undefined}
          >
            <p
              className={`font-semibold ${
                submitResult.success ? '' : 'text-red-800'
              }`}
              style={submitResult.success ? { color: '#421264' } : undefined}
            >
              {submitResult.message}
            </p>
            {submitResult.success && submitResult.data && (
              <div className="mt-3 space-y-2 text-sm">
                <p style={{ color: '#421264' }}>
                  <strong>GitHub Issue:</strong>{' '}
                  <a
                    href={submitResult.data.githubIssue}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-80"
                    style={{ color: '#9F25F4' }}
                  >
                    View Issue
                  </a>
                </p>
                <p style={{ color: '#421264' }}>
                  <strong>ClickUp Task:</strong>{' '}
                  <a
                    href={submitResult.data.clickupTask}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-80"
                    style={{ color: '#9F25F4' }}
                  >
                    View Task
                  </a>
                </p>
                <p style={{ color: '#421264' }}>
                  <strong>Priority:</strong> {submitResult.data.enhancedReport.priority}/5
                </p>
                <p style={{ color: '#421264' }}>
                  <strong>Labels:</strong> {submitResult.data.enhancedReport.labels.join(', ')}
                </p>
                <p style={{ color: '#421264' }}>
                  <strong>Repository:</strong> {submitResult.data.enhancedReport.targetRepo}
                </p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-container form-card rounded-lg p-8 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[rgba(0,0,0,0.75)] mb-2">
              Bug Title *
            </label>
            <div className="relative">
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2 bg-[var(--input-bg)] border rounded-lg focus:ring-2 focus:border-transparent ${
                  getFieldError('title')
                    ? 'border-red-300 focus:ring-red-500'
                    : isFieldValid('title')
                    ? 'border-green-300 focus:ring-green-500'
                    : 'border-[rgba(255,255,255,0.15)] focus:ring-[#f4ebff] focus:border-[#9f30ed]'
                }`}
                placeholder="Brief description of the bug"
              />
              {isFieldValid('title') && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            {getFieldError('title') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('title')}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[rgba(0,0,0,0.75)] mb-2">
              Description *
            </label>
            <div className="relative">
              <textarea
                id="description"
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
                onBlur={handleBlur}
                rows={4}
                className={`w-full px-4 py-2 bg-[var(--input-bg)] border rounded-lg focus:ring-2 focus:border-transparent ${
                  getFieldError('description')
                    ? 'border-red-300 focus:ring-red-500'
                    : isFieldValid('description')
                    ? 'border-green-300 focus:ring-green-500'
                    : 'border-[rgba(255,255,255,0.15)] focus:ring-[#f4ebff] focus:border-[#9f30ed]'
                }`}
                placeholder="Detailed description of the bug"
              />
              {isFieldValid('description') && (
                <div className="absolute top-3 right-3 pointer-events-none">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            {getFieldError('description') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('description')}</p>
            )}
          </div>

          {/* Steps to Reproduce */}
          <div>
            <label htmlFor="stepsToReproduce" className="block text-sm font-medium text-[rgba(0,0,0,0.75)] mb-2">
              Steps to Reproduce
            </label>
            <textarea
              id="stepsToReproduce"
              name="stepsToReproduce"
              value={formData.stepsToReproduce}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[rgba(255,255,255,0.15)] rounded-lg focus:ring-2 focus:ring-[#f4ebff] focus:border-[#9f30ed]"
              placeholder="1. Go to...\n2. Click on...\n3. See error"
            />
          </div>

          {/* Expected vs Actual Behavior */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="expectedBehavior" className="block text-sm font-medium text-[rgba(0,0,0,0.75)] mb-2">
                Expected Behavior
              </label>
              <textarea
                id="expectedBehavior"
                name="expectedBehavior"
                value={formData.expectedBehavior}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[rgba(255,255,255,0.15)] rounded-lg focus:ring-2 focus:ring-[#f4ebff] focus:border-[#9f30ed]"
                placeholder="What should happen?"
              />
            </div>
            <div>
              <label htmlFor="actualBehavior" className="block text-sm font-medium text-[rgba(0,0,0,0.75)] mb-2">
                Actual Behavior
              </label>
              <textarea
                id="actualBehavior"
                name="actualBehavior"
                value={formData.actualBehavior}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[rgba(255,255,255,0.15)] rounded-lg focus:ring-2 focus:ring-[#f4ebff] focus:border-[#9f30ed]"
                placeholder="What actually happens?"
              />
            </div>
          </div>

          {/* Severity and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="severity" className="block text-sm font-medium text-[rgba(0,0,0,0.75)] mb-2">
                Severity *
              </label>
              <select
                id="severity"
                name="severity"
                required
                value={formData.severity}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[rgba(255,255,255,0.15)] rounded-lg focus:ring-2 focus:ring-[#f4ebff] focus:border-[#9f30ed]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-[rgba(0,0,0,0.75)] mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[rgba(255,255,255,0.15)] rounded-lg focus:ring-2 focus:ring-[#f4ebff] focus:border-[#9f30ed]"
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
              <label htmlFor="userEmail" className="block text-sm font-medium text-[rgba(0,0,0,0.75)] mb-2">
                Your Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="userEmail"
                  name="userEmail"
                  value={formData.userEmail}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-2 bg-[var(--input-bg)] border rounded-lg focus:ring-2 focus:border-transparent ${
                    getFieldError('userEmail')
                      ? 'border-red-300 focus:ring-red-500'
                      : isFieldValid('userEmail')
                      ? 'border-green-300 focus:ring-green-500'
                      : 'border-[rgba(255,255,255,0.15)] focus:ring-[#f4ebff] focus:border-[#9f30ed]'
                  }`}
                  placeholder="your@email.com"
                />
                {isFieldValid('userEmail') && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {getFieldError('userEmail') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('userEmail')}</p>
              )}
            </div>
            <div>
              <label htmlFor="environment" className="block text-sm font-medium text-[rgba(0,0,0,0.75)] mb-2">
                Environment
              </label>
              <input
                type="text"
                id="environment"
                name="environment"
                value={formData.environment}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[rgba(255,255,255,0.15)] rounded-lg focus:ring-2 focus:ring-[#f4ebff] focus:border-[#9f30ed]"
                placeholder="Production, Staging, etc."
              />
            </div>
          </div>

          {/* Browser Info */}
          <div>
            <label htmlFor="browserInfo" className="block text-sm font-medium text-[rgba(0,0,0,0.75)] mb-2">
              Browser Information
            </label>
            <input
              type="text"
              id="browserInfo"
              name="browserInfo"
              value={formData.browserInfo}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[rgba(255,255,255,0.15)] rounded-lg focus:ring-2 focus:ring-[#f4ebff] focus:border-[#9f30ed]"
              placeholder="Chrome 120, Safari 17, etc."
            />
          </div>

          {/* File Attachments */}
          <div>
            <label htmlFor="attachments" className="block text-sm font-medium text-[rgba(0,0,0,0.75)] mb-2">
              Attachments
            </label>
            <div className="mt-1">
              <input
                type="file"
                id="attachments"
                name="attachments"
                onChange={handleFileChange}
                multiple
                accept="image/*,video/mp4,video/quicktime,text/plain,.log,application/pdf,application/json"
                className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[rgba(255,255,255,0.15)] rounded-lg focus:ring-2 focus:ring-[#f4ebff] focus:border-[#9f30ed] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-800 hover:file:bg-purple-100"
              />
              <p className="mt-1 text-xs text-[rgba(0,0,0,0.45)]">
                Upload screenshots, videos, or log files (max 10MB per file, formats: JPG, PNG, GIF, WebP, MP4, MOV, TXT, LOG, PDF, JSON)
              </p>
            </div>

            {/* File Preview */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {file.type.startsWith('image/') ? (
                        <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-200">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-12 h-12 rounded bg-purple-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[rgba(0,0,0,0.75)] truncate">{file.name}</p>
                        <p className="text-xs text-[rgba(0,0,0,0.45)]">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0 ml-4 text-red-600 hover:text-red-800 focus:outline-none"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#f4ebff] focus:border-[#9f30ed] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      </div>
    </div>
  );
}
