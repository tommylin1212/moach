import pino, { Logger } from 'pino';
import type { 
  LoggerConfig, 
  TypedLogger, 
  BaseLogContext,
  RequestLogContext,
  DatabaseLogContext,
  AILogContext,
  ErrorLogContext,
  PerformanceLogContext,
  SecurityLogContext
} from './types';
import { getCorrelationData } from './correlation';

/**
 * Create a backend logger instance for Node.js runtime
 */
export function createBackendLogger(config: LoggerConfig): TypedLogger {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const pinoConfig = {
    level: config.level,
    name: config.serviceName,
    
    // Custom formatters
    formatters: {
      level: (label: string) => ({ level: label }),
      bindings: (bindings: pino.Bindings) => ({
        pid: bindings.pid,
        hostname: bindings.hostname,
        service: config.serviceName,
        environment: process.env.NODE_ENV || 'unknown',
      }),
    },

    // Standard serializers for common objects
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },

    // Base context that gets added to every log
    base: {
      service: config.serviceName,
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || 'unknown',
    },

    // Development pretty printing
    transport: isDevelopment && config.prettyPrint ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    } : undefined,

    // Merge any additional Pino config
    ...config.pinoConfig,
  };

  const baseLogger = pino(pinoConfig);

  // Create enhanced logger with typed methods
  const enhancedLogger = Object.assign(baseLogger, {
    request: (context: RequestLogContext, message: string, ...args: unknown[]) => {
      baseLogger.info({
        ...getCorrelationData(),
        ...context,
        type: 'request',
      }, message, ...args);
    },

    database: (context: DatabaseLogContext, message: string, ...args: unknown[]) => {
      baseLogger.info({
        ...getCorrelationData(),
        ...context,
        type: 'database',
      }, message, ...args);
    },

    ai: (context: AILogContext, message: string, ...args: unknown[]) => {
      baseLogger.info({
        ...getCorrelationData(),
        ...context,
        type: 'ai',
      }, message, ...args);
    },

    error: (contextOrError: ErrorLogContext | Error, message?: string, ...args: unknown[]) => {
      if (contextOrError instanceof Error) {
        baseLogger.error({
          ...getCorrelationData(),
          err: contextOrError,
          type: 'error',
        }, message || contextOrError.message, ...args);
      } else {
        baseLogger.error({
          ...getCorrelationData(),
          ...contextOrError,
          type: 'error',
        }, message || 'Error occurred', ...args);
      }
    },

    performance: (context: PerformanceLogContext, message: string, ...args: unknown[]) => {
      baseLogger.info({
        ...getCorrelationData(),
        ...context,
        type: 'performance',
      }, message, ...args);
    },

    security: (context: SecurityLogContext, message: string, ...args: unknown[]) => {
      baseLogger.warn({
        ...getCorrelationData(),
        ...context,
        type: 'security',
      }, message, ...args);
    },

    withContext: (context: BaseLogContext): TypedLogger => {
      const childLogger = baseLogger.child({
        ...getCorrelationData(),
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
 * Create a high-performance logger with extreme mode
 * Warning: May lose logs on unexpected process termination
 * Note: Extreme mode is only available in newer versions of Pino
 */
export function createHighPerformanceLogger(config: LoggerConfig): TypedLogger {
  // Check if extreme mode is available
  const pinoExtreme = (pino as any).extreme;
  
  if (!pinoExtreme) {
    // Fallback to regular logger if extreme mode not available
    console.warn('Pino extreme mode not available, using regular logger');
    return createBackendLogger(config);
  }

  const dest = pinoExtreme();
  const logger = createBackendLogger({
    ...config,
    pinoConfig: {
      ...config.pinoConfig,
      // Write to extreme destination
    },
  });

  // Periodic flushing to minimize log loss
  const flushInterval = setInterval(() => {
    if (dest && typeof dest.flush === 'function') {
      dest.flush();
    }
  }, 10000);

  // Graceful shutdown handling
  const pinoFinal = (pino as any).final;
  if (pinoFinal) {
    const handler = pinoFinal(logger as Logger, (err: Error | null, finalLogger: Logger, evt: string) => {
      clearInterval(flushInterval);
      finalLogger.info(`${evt} caught`);
      if (err) finalLogger.error(err, 'error caused exit');
      process.exit(err ? 1 : 0);
    });

    // Register process event handlers
    process.on('beforeExit', () => handler(null, 'beforeExit'));
    process.on('exit', () => handler(null, 'exit'));
    process.on('uncaughtException', (err) => handler(err, 'uncaughtException'));
    process.on('SIGINT', () => handler(null, 'SIGINT'));
    process.on('SIGQUIT', () => handler(null, 'SIGQUIT'));
    process.on('SIGTERM', () => handler(null, 'SIGTERM'));
  }

  return logger;
}

/**
 * Create a logger with custom transports (e.g., external services)
 */
export function createLoggerWithTransports(
  config: LoggerConfig,
  transports: pino.TransportTargetOptions[]
): TypedLogger {
  return createBackendLogger({
    ...config,
    pinoConfig: {
      ...config.pinoConfig,
      transport: {
        targets: transports,
      },
    },
  });
}

/**
 * Default backend logger configuration
 */
export const defaultBackendConfig: LoggerConfig = {
  level: (process.env.LOG_LEVEL as any) || 'info',
  environment: 'nodejs',
  serviceName: 'moach-backend',
  prettyPrint: process.env.NODE_ENV === 'development',
};

/**
 * Create default backend logger instance
 */
export function createDefaultBackendLogger(): TypedLogger {
  return createBackendLogger(defaultBackendConfig);
}
