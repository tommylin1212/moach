/**
 * Main logger export for the Moach application
 * 
 * This file provides the primary logger instance that automatically
 * adapts to the current runtime environment (Node.js, Browser, Edge).
 * 
 * Usage:
 * ```typescript
 * import logger from '@/lib/logger';
 * 
 * // Basic logging
 * logger.info('Application started');
 * logger.error(error, 'Something went wrong');
 * 
 * // Typed context logging
 * logger.request({ method: 'GET', url: '/api/users' }, 'Processing request');
 * logger.database({ operation: 'select', table: 'users' }, 'Querying users');
 * logger.ai({ model: 'gpt-4', promptTokens: 100 }, 'AI request completed');
 * 
 * // With correlation context
 * const contextLogger = logger.withContext({ userId: '123', conversationId: 'abc' });
 * contextLogger.info('User action logged');
 * ```
 */

export { logger as default, log, loggers, createLogger } from './logging';

// Re-export commonly used types and utilities
export type {
  TypedLogger,
  LogLevel,
  BaseLogContext,
  RequestLogContext,
  DatabaseLogContext,
  AILogContext,
  ErrorLogContext,
  PerformanceLogContext,
  SecurityLogContext,
} from './logging';

export {
  withRequestLogging,
  withDatabaseLogging,
  withAILogging,
  createTimer,
  getCorrelationContext,
  getRequestId,
  getUserId,
  getConversationId,
} from './logging';
