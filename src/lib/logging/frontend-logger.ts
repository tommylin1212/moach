import pino from 'pino';
import type { 
  LoggerConfig, 
  TypedLogger, 
  BaseLogContext,
  RequestLogContext,
  DatabaseLogContext,
  AILogContext,
  ErrorLogContext,
  PerformanceLogContext,
  SecurityLogContext,
  LogTransmissionConfig,
  LogEntry
} from './types';

/**
 * Log queue for batching frontend logs
 */
class LogQueue {
  private queue: LogEntry[] = [];
  private config: LogTransmissionConfig;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: LogTransmissionConfig) {
    this.config = config;
    this.startFlushTimer();
  }

  add(entry: LogEntry): void {
    this.queue.push(entry);
    
    if (this.queue.length >= (this.config.batchSize || 10)) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval || 5000);
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const logsToSend = [...this.queue];
    this.queue = [];

    try {
      await this.sendLogs(logsToSend);
    } catch (error) {
      // Re-queue failed logs (up to max retries)
      console.warn('Failed to send logs to backend:', error);
      // In a production implementation, you might want to implement retry logic
    }
  }

  private async sendLogs(logs: LogEntry[]): Promise<void> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs }),
      keepalive: this.config.keepalive ?? true,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Final flush
  }
}

/**
 * Create a frontend logger instance for browser runtime
 */
export function createFrontendLogger(
  config: LoggerConfig,
  transmissionConfig?: LogTransmissionConfig
): TypedLogger {
  const logQueue = transmissionConfig ? new LogQueue(transmissionConfig) : null;

  const pinoConfig = {
    level: config.level,
    name: config.serviceName,
    
    browser: {
      asObject: true,
      serialize: true,
      transmit: logQueue ? {
        level: config.level,
        send: (level: string, logEvent: any) => {
          const entry: LogEntry = {
            level: level as any,
            timestamp: new Date().toISOString(),
            message: logEvent.messages?.[0] || '',
            context: logEvent,
            source: 'browser',
            service: config.serviceName,
          };
          logQueue.add(entry);
        },
      } : undefined,
    },

    // Base context for all logs
    base: {
      service: config.serviceName,
      environment: process.env.NODE_ENV || 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    },
  };

  const baseLogger = pino(pinoConfig);

  // Get correlation data from session storage or context
  const getClientCorrelationData = () => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = sessionStorage.getItem('correlationContext');
        return stored ? JSON.parse(stored) : {};
      }
    } catch {
      // Ignore storage errors
    }
    return {};
  };

  // Create enhanced logger with typed methods
  const enhancedLogger = Object.assign(baseLogger, {
    request: (context: RequestLogContext, message: string, ...args: unknown[]) => {
      baseLogger.info({
        ...getClientCorrelationData(),
        ...context,
        type: 'request',
      }, message, ...args);
    },

    database: (context: DatabaseLogContext, message: string, ...args: unknown[]) => {
      // Database operations typically don't happen in frontend, but included for consistency
      baseLogger.info({
        ...getClientCorrelationData(),
        ...context,
        type: 'database',
      }, message, ...args);
    },

    ai: (context: AILogContext, message: string, ...args: unknown[]) => {
      baseLogger.info({
        ...getClientCorrelationData(),
        ...context,
        type: 'ai',
      }, message, ...args);
    },

    error: (contextOrError: ErrorLogContext | Error, message?: string, ...args: unknown[]) => {
      if (contextOrError instanceof Error) {
        baseLogger.error({
          ...getClientCorrelationData(),
          err: {
            name: contextOrError.name,
            message: contextOrError.message,
            stack: contextOrError.stack,
          },
          type: 'error',
        }, message || contextOrError.message, ...args);
      } else {
        baseLogger.error({
          ...getClientCorrelationData(),
          ...contextOrError,
          type: 'error',
        }, message || 'Error occurred', ...args);
      }
    },

    performance: (context: PerformanceLogContext, message: string, ...args: unknown[]) => {
      baseLogger.info({
        ...getClientCorrelationData(),
        ...context,
        type: 'performance',
      }, message, ...args);
    },

    security: (context: SecurityLogContext, message: string, ...args: unknown[]) => {
      baseLogger.warn({
        ...getClientCorrelationData(),
        ...context,
        type: 'security',
      }, message, ...args);
    },

    withContext: (context: BaseLogContext): TypedLogger => {
      const childLogger = baseLogger.child({
        ...getClientCorrelationData(),
        ...context,
      });
      
      return Object.assign(childLogger, {
        request: enhancedLogger.request,
        database: enhancedLogger.database,
        ai: enhancedLogger.ai,
        error: enhancedLogger.error,
        performance: enhancedLogger.performance,
        security: enhancedLogger.security,
        withContext: enhancedLogger.withContext,
      });
    },
  }) as TypedLogger;

  // Cleanup on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      logQueue?.destroy();
    });
  }

  return enhancedLogger;
}

/**
 * Set correlation context in session storage for frontend logging
 */
export function setClientCorrelationContext(context: BaseLogContext): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem('correlationContext', JSON.stringify(context));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get correlation context from session storage
 */
export function getClientCorrelationContext(): BaseLogContext | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = sessionStorage.getItem('correlationContext');
      return stored ? JSON.parse(stored) : null;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

/**
 * Clear correlation context from session storage
 */
export function clearClientCorrelationContext(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem('correlationContext');
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Create a logger that automatically captures unhandled errors
 */
export function createFrontendLoggerWithErrorCapture(
  config: LoggerConfig,
  transmissionConfig?: LogTransmissionConfig
): TypedLogger {
  const logger = createFrontendLogger(config, transmissionConfig);

  // Capture unhandled errors
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      logger.error({
        errorType: 'unhandled_error',
        stack: event.error?.stack,
        errorMeta: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      }, `Unhandled error: ${event.message}`);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logger.error({
        errorType: 'unhandled_rejection',
        errorMeta: {
          reason: event.reason,
        },
      }, `Unhandled promise rejection: ${event.reason}`);
    });
  }

  return logger;
}

/**
 * Default frontend logger configuration
 */
export const defaultFrontendConfig: LoggerConfig = {
  level: 'info',
  environment: 'browser',
  serviceName: 'moach-frontend',
  prettyPrint: false, // Pretty printing not typically used in browser
};

/**
 * Default transmission configuration for sending logs to backend
 */
export const defaultTransmissionConfig: LogTransmissionConfig = {
  endpoint: '/api/logs',
  batchSize: 10,
  flushInterval: 5000,
  maxRetries: 3,
  keepalive: true,
};

/**
 * Create default frontend logger instance
 */
export function createDefaultFrontendLogger(): TypedLogger {
  return createFrontendLogger(defaultFrontendConfig, defaultTransmissionConfig);
}
