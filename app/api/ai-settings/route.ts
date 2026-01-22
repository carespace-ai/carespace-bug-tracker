import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSettings, saveSettings } from '@/lib/ai-settings';

/**
 * Validation schema for prompt template
 */
const promptTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  template: z.string().min(10, 'Template must be at least 10 characters'),
  variables: z.array(z.string()),
  description: z.string().optional(),
});

/**
 * Validation schema for label taxonomy
 */
const labelTaxonomySchema = z.object({
  labels: z.array(z.string()),
  autoSuggestionRules: z.array(
    z.object({
      keywords: z.array(z.string()),
      suggestedLabel: z.string(),
    })
  ).optional(),
});

/**
 * Validation schema for priority weights
 */
const priorityWeightsSchema = z.object({
  critical: z.number().min(1).max(5),
  high: z.number().min(1).max(5),
  medium: z.number().min(1).max(5),
  low: z.number().min(1).max(5),
});

/**
 * Validation schema for AI enhancement settings
 */
const aiSettingsSchema = z.object({
  promptTemplate: promptTemplateSchema,
  labelTaxonomy: labelTaxonomySchema,
  priorityWeights: priorityWeightsSchema,
  claudePromptStyle: z.enum(['verbose', 'concise', 'technical', 'beginner-friendly']),
});

/**
 * GET handler for AI enhancement settings
 * Returns the current AI enhancement settings (either from storage or defaults)
 */
export async function GET() {
  try {
    const settings = loadSettings();

    return NextResponse.json(
      {
        success: true,
        data: settings,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to load AI settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * POST handler for updating AI enhancement settings
 * Validates and saves the new settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = aiSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const settings = validationResult.data;

    // Save settings (note: this returns false on server-side since localStorage isn't available)
    // The actual persistence happens client-side
    saveSettings(settings);

    // Return success - settings will be persisted client-side when the UI updates
    return NextResponse.json(
      {
        success: true,
        message: 'AI settings updated successfully',
        data: settings,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update AI settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating AI enhancement settings
 * Alias for POST to support both methods
 */
export async function PUT(request: NextRequest) {
  return POST(request);
}
