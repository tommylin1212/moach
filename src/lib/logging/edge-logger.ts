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
  LogEntry
} from './types';

/**
 * Check if we're running in Edge Runtime
 */
function isEdgeRuntime(): boolean {
  return (
    typeof (globalThis as any).EdgeRuntime !== 'undefined' ||
    // Check for Vercel Edge Runtime
    typeof process === 'undefined' ||
    // Check for other edge runtime indicators
    typeof navigator !== 'undefined' && navigator.userAgent?.includes('Edge')
  );
}

/**
 * Lightweight log transmission for edge environments
 */
async function transmitLog(entry: LogEntry, endpoint?: string): Promise<void> {
  if (!endpoint) {
    // Fallback to console if no endpoint configured
    console.log(JSON.stringify(entry));
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      // Fallback to console on transmission failure
      console.error(`Failed to transmit log: ${response.status}`);
      console.log(JSON.stringify(entry));
    }
  } catch (error) {
    // Fallback to console on network error
    console.error('Log transmission error:', error);
    console.log(JSON.stringify(entry));
  }
}

/**
 * Create an edge-compatible logger instance
 */
export function createEdgeLogger(
  config: LoggerConfig,
  logEndpoint?: string
): TypedLogger {
  // Minimal Pino configuration for edge runtime
  const pinoConfig = {
    level: config.level,
    name: config.serviceName,
    
    // Edge runtime compatible configuration
    browser: isEdgeRuntime() ? {
      asObject: true,
      serialize: true,
      transmit: {
        level: config.level,
        send: async (level: string, logEvent: any) => {
          const entry: LogEntry = {
            level: level as any,
            timestamp: new Date().toISOString(),
            message: logEvent.messages?.[0] || '',
            context: logEvent,
            source: 'edge',
            service: config.serviceName,
          };
          
          // Non-blocking transmission
          transmitLog(entry, logEndpoint).catch(() => {
            // Ignore transmission errors to prevent blocking
          });
        },
      },
    } : undefined,

    // Minimal base context for edge environments
    base: {
      service: config.serviceName,
      environment: 'edge',
      runtime: isEdgeRuntime() ? 'edge' : 'nodejs',
    },

    // Simplified serializers for edge compatibility
    serializers: {
      err: (err: Error) => ({
        name: err.name,
        message: err.message,
        stack: err.stack,
      }),
      ...(isEdgeRuntime() ? {} : {
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      }),
    },
  };

  const baseLogger = pino(pinoConfig);

  // Simplified correlation data for edge environments
  const getEdgeCorrelationData = () => {
    // In edge environments, we rely on headers or minimal context
    return {};
  };

  // Create enhanced logger with typed methods
  const enhancedLogger = Object.assign(baseLogger, {
    request: (context: RequestLogContext, message: string, ...args: unknown[]) => {
      baseLogger.info({
        ...getEdgeCorrelationData(),
        ...context,
        type: 'request',
      }, message, ...args);
    },

    database: (context: DatabaseLogContext, message: string, ...args: unknown[]) => {
      baseLogger.info({
        ...getEdgeCorrelationData(),
        ...context,
        type: 'database',
      }, message, ...args);
    },

    ai: (context: AILogContext, message: string, ...args: unknown[]) => {
      baseLogger.info({
        ...getEdgeCorrelationData(),
        ...context,
        type: 'ai',
      }, message, ...args);
    },

    error: (contextOrError: ErrorLogContext | Error, message?: string, ...args: unknown[]) => {
      if (contextOrError instanceof Error) {
        baseLogger.error({
          ...getEdgeCorrelationData(),
          err: contextOrError,
          type: 'error',
        }, message || contextOrError.message, ...args);
      } else {
        baseLogger.error({
          ...getEdgeCorrelationData(),
          ...contextOrError,
          type: 'error',
        }, message || 'Error occurred', ...args);
      }
    },

    performance: (context: PerformanceLogContext, message: string, ...args: unknown[]) => {
      baseLogger.info({
        ...getEdgeCorrelationData(),
        ...context,
        type: 'performance',
      }, message, ...args);
    },

    security: (context: SecurityLogContext, message: string, ...args: unknown[]) => {
      baseLogger.warn({
        ...getEdgeCorrelationData(),
        ...context,
        type: 'security',
      }, message, ...args);
    },

    withContext: (context: BaseLogContext): TypedLogger => {
      const childLogger = baseLogger.child({
        ...getEdgeCorrelationData(),
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

  return enhancedLogger;
}

/**
 * Create a logger that automatically detects the runtime environment
 */
export function createAdaptiveLogger(config: LoggerConfig): TypedLogger {
  if (isEdgeRuntime()) {
    return createEdgeLogger(config, config.logEndpoint);
  }
  
  // Fallback to a simplified Node.js logger for non-edge environments
  return createEdgeLogger(config, config.logEndpoint);
}

/**
 * Edge-specific performance logger with minimal overhead
 */
export function createEdgePerformanceLogger(config: LoggerConfig): TypedLogger {
  const logger = createEdgeLogger(config);
  
  // Add performance monitoring utilities
  const performanceLogger = Object.assign(logger, {
    time: (label: string) => {
      const start = Date.now();
      return {
        end: (additionalContext?: Record<string, unknown>) => {
          const duration = Date.now() - start;
          logger.performance({
            operation: label,
            duration,
            ...additionalContext,
          }, `Operation ${label} completed in ${duration}ms`);
        },
      };
    },
    
    measure: async <T>(
      label: string, 
      fn: () => Promise<T>,
      additionalContext?: Record<string, unknown>
    ): Promise<T> => {
      const start = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - start;
        logger.performance({
          operation: label,
          duration,
          success: true,
          ...additionalContext,
        }, `Operation ${label} completed successfully in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.performance({
          operation: label,
          duration,
          success: false,
          errorMeta: error instanceof Error ? {
            message: error.message,
            name: error.name,
            stack: error.stack,
          } : {
            message: 'Unknown error',
          },
          ...additionalContext,
        }, `Operation ${label} failed after ${duration}ms`);
        throw error;
      }
    },
  });

  return performanceLogger;
}

/**
 * Create a minimal console-only logger for edge environments with strict limitations
 */
export function createMinimalEdgeLogger(serviceName: string): TypedLogger {
  const log = (level: string, context: any, message: string, ...args: unknown[]) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: serviceName,
      message,
      context,
      args,
    };
    console.log(JSON.stringify(entry));
  };

  const baseLogger = {
    trace: (obj: any, msg?: string, ...args: unknown[]) => log('trace', obj, msg || '', ...args),
    debug: (obj: any, msg?: string, ...args: unknown[]) => log('debug', obj, msg || '', ...args),
    info: (obj: any, msg?: string, ...args: unknown[]) => log('info', obj, msg || '', ...args),
    warn: (obj: any, msg?: string, ...args: unknown[]) => log('warn', obj, msg || '', ...args),
    error: (obj: any, msg?: string, ...args: unknown[]) => log('error', obj, msg || '', ...args),
    fatal: (obj: any, msg?: string, ...args: unknown[]) => log('fatal', obj, msg || '', ...args),
    child: () => baseLogger,
  } as any;

  return Object.assign(baseLogger, {
    request: (context: RequestLogContext, message: string, ...args: unknown[]) => {
      log('info', { ...context, type: 'request' }, message, ...args);
    },
    database: (context: DatabaseLogContext, message: string, ...args: unknown[]) => {
      log('info', { ...context, type: 'database' }, message, ...args);
    },
    ai: (context: AILogContext, message: string, ...args: unknown[]) => {
      log('info', { ...context, type: 'ai' }, message, ...args);
    },
    performance: (context: PerformanceLogContext, message: string, ...args: unknown[]) => {
      log('info', { ...context, type: 'performance' }, message, ...args);
    },
    security: (context: SecurityLogContext, message: string, ...args: unknown[]) => {
      log('warn', { ...context, type: 'security' }, message, ...args);
    },
    withContext: (context: BaseLogContext) => baseLogger,
  }) as TypedLogger;
}

/**
 * Default edge logger configuration
 */
export const defaultEdgeConfig: LoggerConfig = {
  level: 'info',
  environment: 'edge',
  serviceName: 'moach-edge',
  prettyPrint: false,
  logEndpoint: process.env.LOG_ENDPOINT,
};

/**
 * Create default edge logger instance
 */
export function createDefaultEdgeLogger(): TypedLogger {
  return createEdgeLogger(defaultEdgeConfig);
}
