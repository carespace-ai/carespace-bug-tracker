import { z } from 'zod';

/**
 * Shared Zod schema for bug report validation
 * Used by both API route and client-side form validation
 */
export const bugReportSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  stepsToReproduce: z.string().optional(),
  expectedBehavior: z.string().optional(),
  actualBehavior: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.enum(['ui', 'functionality', 'performance', 'security', 'other']).optional(),
  userEmail: z.string().email().optional(),
  environment: z.string().optional(),
  browserInfo: z.string().optional(),
});

/**
 * Type inference from schema
 */
export type BugReportInput = z.infer<typeof bugReportSchema>;
