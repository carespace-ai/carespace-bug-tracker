import { useState } from 'react';
import { BugReport } from '@/lib/types';

interface SubmitResult {
  success: boolean;
  message: string;
  data?: any;
}

export function useBugReportForm() {
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
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return {
    formData,
    isSubmitting,
    submitResult,
    handleSubmit,
    handleChange,
  };
}
