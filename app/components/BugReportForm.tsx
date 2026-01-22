import React from 'react';
import { BugReport } from '@/lib/types';
import { TextInput } from './FormFields/TextInput';
import { TextArea } from './FormFields/TextArea';
import { SelectInput } from './FormFields/SelectInput';
import SubmitButton from './SubmitButton';

interface BugReportFormProps {
  formData: Partial<BugReport>;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export const BugReportForm: React.FC<BugReportFormProps> = ({
  formData,
  isSubmitting,
  onSubmit,
  onChange,
}) => {
  const severityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  const categoryOptions = [
    { value: 'ui', label: 'UI' },
    { value: 'functionality', label: 'Functionality' },
    { value: 'performance', label: 'Performance' },
    { value: 'security', label: 'Security' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <form onSubmit={onSubmit} className="bg-white shadow-xl rounded-lg p-8 space-y-6">
      {/* Title */}
      <TextInput
        label="Bug Title *"
        id="title"
        name="title"
        required
        value={formData.title || ''}
        onChange={onChange}
        placeholder="Brief description of the bug"
      />

      {/* Description */}
      <TextArea
        label="Description *"
        id="description"
        name="description"
        required
        value={formData.description || ''}
        onChange={onChange}
        rows={4}
        placeholder="Detailed description of the bug"
      />

      {/* Steps to Reproduce */}
      <TextArea
        label="Steps to Reproduce"
        id="stepsToReproduce"
        name="stepsToReproduce"
        value={formData.stepsToReproduce || ''}
        onChange={onChange}
        rows={3}
        placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
      />

      {/* Expected vs Actual Behavior */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextArea
          label="Expected Behavior"
          id="expectedBehavior"
          name="expectedBehavior"
          value={formData.expectedBehavior || ''}
          onChange={onChange}
          rows={3}
          placeholder="What should happen?"
        />
        <TextArea
          label="Actual Behavior"
          id="actualBehavior"
          name="actualBehavior"
          value={formData.actualBehavior || ''}
          onChange={onChange}
          rows={3}
          placeholder="What actually happens?"
        />
      </div>

      {/* Severity and Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectInput
          label="Severity *"
          id="severity"
          name="severity"
          required
          value={formData.severity || 'medium'}
          onChange={onChange}
          options={severityOptions}
        />
        <SelectInput
          label="Category *"
          id="category"
          name="category"
          required
          value={formData.category || 'functionality'}
          onChange={onChange}
          options={categoryOptions}
        />
      </div>

      {/* Contact and Environment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="Your Email"
          id="userEmail"
          name="userEmail"
          type="email"
          value={formData.userEmail || ''}
          onChange={onChange}
          placeholder="your@email.com"
        />
        <TextInput
          label="Environment"
          id="environment"
          name="environment"
          value={formData.environment || ''}
          onChange={onChange}
          placeholder="Production, Staging, etc."
        />
      </div>

      {/* Browser Info */}
      <TextInput
        label="Browser Information"
        id="browserInfo"
        name="browserInfo"
        value={formData.browserInfo || ''}
        onChange={onChange}
        placeholder="Chrome 120, Safari 17, etc."
      />

      {/* Submit Button */}
      <SubmitButton isSubmitting={isSubmitting} />
    </form>
  );
};
