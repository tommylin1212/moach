/**
 * Unified logging system for Moach application
 * 
 * This module provides a comprehensive logging solution that works across:
 * - Backend (Node.js runtime)
 * - Frontend (Browser)
 * - Edge Runtime (Serverless functions)
 * 
 * Features:
 * - Structured JSON logging with Pino
 * - Request correlation tracking
 * - Performance monitoring
 * - Error tracking
 * - Security event logging
 * - Typed logging contexts
 */

// Core types
export type {
  LogLevel,
  RuntimeEnvironment,
  BaseLogContext,
  RequestLogContext,
  DatabaseLogContext,
  AILogContext,
  ErrorLogContext,
  PerformanceLogContext,
  SecurityLogContext,
  LoggerConfig,
  LogTransmissionConfig,
  TypedLogger,
  LogEntry,
  CorrelationContext,
} from './types';

// Logger factories
export {
  createBackendLogger,
  createHighPerformanceLogger,
  createLoggerWithTransports,
  createDefaultBackendLogger,
  defaultBackendConfig,
} from './backend-logger';

export {
  createFrontendLogger,
  createFrontendLoggerWithErrorCapture,
  createDefaultFrontendLogger,
  setClientCorrelationContext,
  getClientCorrelationContext,
  clearClientCorrelationContext,
  defaultFrontendConfig,
  defaultTransmissionConfig,
} from './frontend-logger';

export {
  createEdgeLogger,
  createAdaptiveLogger,
  createEdgePerformanceLogger,
  createMinimalEdgeLogger,
  createDefaultEdgeLogger,
  defaultEdgeConfig,
} from './edge-logger';

// Correlation utilities
export {
  generateCorrelationId,
  getCorrelationContext,
  getRequestId,
  getUserId,
  getConversationId,
  withCorrelation,
  withCorrelationAsync,
  createCorrelationContext,
  updateCorrelationContext,
  getCorrelationData,
  extractCorrelationFromHeaders,
  createCorrelationHeaders,
} from './correlation';

// Middleware and utilities
export {
  createPinoHttpMiddleware,
  createNextMiddleware,
  withRequestLogging,
  withDatabaseLogging,
  withAILogging,
  PerformanceTimer,
  createTimer,
} from './middleware';

// Environment detection and logger creation
import { createBackendLogger, defaultBackendConfig } from './backend-logger';
import { createFrontendLogger, defaultFrontendConfig, defaultTransmissionConfig } from './frontend-logger';
import { createEdgeLogger, defaultEdgeConfig } from './edge-logger';
import type { LoggerConfig, TypedLogger } from './types';

/**
 * Detect the current runtime environment
 */
export function detectRuntimeEnvironment(): 'nodejs' | 'browser' | 'edge' {
  // Check for Edge Runtime
  if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
    return 'edge';
  }
  
  // Check for browser environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }
  
  // Check for Node.js environment
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return 'nodejs';
  }
  
  // Default to edge for unknown environments (safer for serverless)
  return 'edge';
}

/**
 * Create a logger instance that automatically adapts to the current environment
 */
export function createLogger(config?: Partial<LoggerConfig>): TypedLogger {
  const environment = detectRuntimeEnvironment();
  
  switch (environment) {
    case 'nodejs':
      return createBackendLogger({
        ...defaultBackendConfig,
        ...config,
        environment: 'nodejs',
      });
      
    case 'browser':
      return createFrontendLogger(
        {
          ...defaultFrontendConfig,
          ...config,
          environment: 'browser',
        },
        defaultTransmissionConfig
      );
      
    case 'edge':
      return createEdgeLogger({
        ...defaultEdgeConfig,
        ...config,
        environment: 'edge',
      });
      
    default:
      // Fallback to edge logger for unknown environments
      return createEdgeLogger({
        ...defaultEdgeConfig,
        ...config,
        environment: 'edge',
      });
  }
}

/**
 * Default logger instance - automatically adapts to environment
 */
export const logger = createLogger({
  serviceName: 'moach',
  level: (process.env.LOG_LEVEL as any) || 'info',
});

/**
 * Create environment-specific loggers
 */
export const loggers = {
  backend: () => createBackendLogger(defaultBackendConfig),
  frontend: () => createFrontendLogger(defaultFrontendConfig, defaultTransmissionConfig),
  edge: () => createEdgeLogger(defaultEdgeConfig),
  adaptive: (config?: Partial<LoggerConfig>) => createLogger(config),
};

/**
 * Convenience logging functions using the default logger
 */
export const log = {
  trace: logger.trace.bind(logger),
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  fatal: logger.fatal.bind(logger),
  
  // Typed context methods
  request: logger.request.bind(logger),
  database: logger.database.bind(logger),
  ai: logger.ai.bind(logger),
  performance: logger.performance.bind(logger),
  security: logger.security.bind(logger),
  
  // Utility methods
  withContext: logger.withContext.bind(logger),
  child: logger.child.bind(logger),
};

// Re-export the default logger as the main export
export default logger;
