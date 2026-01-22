'use client';

import { useState } from 'react';
import { BugReport } from '@/lib/types';
import BugReportHeader from './components/BugReportHeader';
import SubmitResult from './components/SubmitResult';
import { BugReportForm } from './components/BugReportForm';
import FeatureFooter from './components/FeatureFooter';

const initialFormData: Partial<BugReport> = {
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
};

export default function Home() {
  const [formData, setFormData] = useState<Partial<BugReport>>(initialFormData);
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
        setFormData(initialFormData);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <BugReportHeader />
        <SubmitResult result={submitResult} />
        <BugReportForm
          formData={formData}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onChange={handleChange}
        />
        <FeatureFooter />
      </div>
    </div>
  );
}
