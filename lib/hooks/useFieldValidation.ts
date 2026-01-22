import { useState } from 'react';
import { z } from 'zod';
import { bugReportSchema } from '@/lib/validation/bug-report-schema';

/**
 * Custom hook for real-time field validation
 * Validates individual form fields against the bug report schema
 */
export function useFieldValidation() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  /**
   * Validate a single field against the schema
   * @param fieldName - The name of the field to validate
   * @param value - The current value of the field
   * @returns The error message if validation fails, undefined otherwise
   */
  const validateField = (fieldName: string, value: unknown): string | undefined => {
    try {
      // Get the field schema from the bug report schema
      const fieldSchema = bugReportSchema.shape[fieldName as keyof typeof bugReportSchema.shape];

      if (fieldSchema) {
        // Handle optional email field - only validate if value is provided
        if (fieldName === 'userEmail' && (!value || value === '')) {
          setFieldErrors(prev => ({ ...prev, [fieldName]: undefined }));
          return undefined;
        }

        fieldSchema.parse(value);
        setFieldErrors(prev => ({ ...prev, [fieldName]: undefined }));
        return undefined;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.issues[0]?.message;
        setFieldErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
        return errorMessage;
      }
    }
    return undefined;
  };

  /**
   * Get the error message for a field (only if the field has been touched)
   * @param fieldName - The name of the field
   * @returns The error message if the field is touched and has an error, undefined otherwise
   */
  const getFieldError = (fieldName: string): string | undefined => {
    return touchedFields[fieldName] ? fieldErrors[fieldName] : undefined;
  };

  /**
   * Mark a field as touched (user has interacted with it)
   * @param fieldName - The name of the field to mark as touched
   */
  const markFieldTouched = (fieldName: string): void => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  };

  /**
   * Clear the error for a specific field
   * @param fieldName - The name of the field to clear
   */
  const clearFieldError = (fieldName: string): void => {
    setFieldErrors(prev => ({ ...prev, [fieldName]: undefined }));
  };

  /**
   * Check if a field is valid (has no errors and has been touched)
   * @param fieldName - The name of the field to check
   * @returns True if the field is valid, false otherwise
   */
  const isFieldValid = (fieldName: string): boolean => {
    return touchedFields[fieldName] && !fieldErrors[fieldName];
  };

  return {
    validateField,
    getFieldError,
    markFieldTouched,
    clearFieldError,
    isFieldValid,
    fieldErrors,
    touchedFields,
  };
}
