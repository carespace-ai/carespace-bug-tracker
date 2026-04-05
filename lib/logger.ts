/**
 * Structured logging utility for the bug tracker pipeline.
 * Provides correlation ID tracking, timing metrics, and consistent log format.
 */

import crypto from 'crypto';

export interface LogContext {
  correlationId: string;
  service?: string;
  operation?: string;
}

/**
 * Generates a unique correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return crypto.randomBytes(8).toString('hex');
}

function formatLog(level: string, message: string, context?: LogContext, data?: Record<string, unknown>): string {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context?.correlationId) entry.correlationId = context.correlationId;
  if (context?.service) entry.service = context.service;
  if (context?.operation) entry.operation = context.operation;
  if (data) entry.data = data;

  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, context?: LogContext, data?: Record<string, unknown>) {
    console.log(formatLog('info', message, context, data));
  },

  warn(message: string, context?: LogContext, data?: Record<string, unknown>) {
    console.warn(formatLog('warn', message, context, data));
  },

  error(message: string, context?: LogContext, data?: Record<string, unknown>) {
    console.error(formatLog('error', message, context, data));
  },

  debug(message: string, context?: LogContext, data?: Record<string, unknown>) {
    console.debug(formatLog('debug', message, context, data));
  },
};

/**
 * Wraps an async operation with timing and logging
 */
export async function withTiming<T>(
  operation: string,
  context: LogContext,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  logger.info(`Starting ${operation}`, context);

  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.info(`Completed ${operation}`, context, { durationMs: duration });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed ${operation}`, context, { durationMs: duration, error: errorMessage });
    throw error;
  }
}
