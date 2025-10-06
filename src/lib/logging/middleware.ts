import { NextRequest, NextResponse } from 'next/server';
import pinoHttp from 'pino-http';
import type { TypedLogger, RequestLogContext } from './types';
import { 
  createCorrelationContext, 
  withCorrelationAsync, 
  extractCorrelationFromHeaders,
  createCorrelationHeaders 
} from './correlation';

/**
 * Configuration for request logging middleware
 */
export interface RequestLoggingConfig {
  /** Logger instance to use */
  logger: TypedLogger;
  /** Whether to log request body (be careful with sensitive data) */
  logRequestBody?: boolean;
  /** Whether to log response body */
  logResponseBody?: boolean;
  /** Maximum body size to log (in bytes) */
  maxBodySize?: number;
  /** Paths to exclude from logging */
  excludePaths?: string[];
  /** Whether to log successful requests */
  logSuccessfulRequests?: boolean;
  /** Custom request ID header name */
  requestIdHeader?: string;
}

/**
 * Default middleware configuration
 */
const defaultConfig: Partial<RequestLoggingConfig> = {
  logRequestBody: false,
  logResponseBody: false,
  maxBodySize: 1024, // 1KB
  excludePaths: ['/favicon.ico', '/health', '/_next'],
  logSuccessfulRequests: true,
  requestIdHeader: 'x-request-id',
};

/**
 * Create Pino HTTP middleware for Express-like frameworks
 */
export function createPinoHttpMiddleware(logger: TypedLogger) {
  return pinoHttp({
    logger: logger as any,
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn';
      } else if (res.statusCode >= 500 || err) {
        return 'error';
      } else if (res.statusCode >= 300 && res.statusCode < 400) {
        return 'info';
      }
      return 'info';
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },
    customAttributeKeys: {
      req: 'request',
      res: 'response',
      err: 'error',
      responseTime: 'duration',
    },
  });
}

/**
 * Next.js middleware for request logging with correlation tracking
 */
export function createNextMiddleware(config: RequestLoggingConfig) {
  const finalConfig = { ...defaultConfig, ...config };

  return async function middleware(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    const { pathname } = request.nextUrl;

    // Skip excluded paths
    if (finalConfig.excludePaths?.some(path => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // Extract or create correlation context
    const correlationFromHeaders = extractCorrelationFromHeaders(request.headers);
    const correlationContext = createCorrelationContext({
      requestId: correlationFromHeaders.requestId,
      userId: correlationFromHeaders.userId,
      conversationId: correlationFromHeaders.conversationId,
    });

    // Execute request within correlation context
    return withCorrelationAsync(correlationContext, async () => {
      let response: NextResponse;
      let error: Error | null = null;

      try {
        // Log incoming request
        const requestContext: RequestLogContext = {
          method: request.method,
          url: pathname,
          userAgent: request.headers.get('user-agent') || undefined,
          ip: request.headers.get('x-forwarded-for') || undefined,
          requestId: correlationContext.requestId,
          userId: correlationContext.userId,
          conversationId: correlationContext.conversationId,
        };

        config.logger.request(requestContext, `Incoming ${request.method} request to ${pathname}`);

        // Process request
        response = NextResponse.next();

        // Add correlation headers to response
        const correlationHeaders = createCorrelationHeaders();
        Object.entries(correlationHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

      } catch (err) {
        error = err instanceof Error ? err : new Error('Unknown error');
        response = NextResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      }

      // Log response
      const duration = Date.now() - startTime;
      const responseContext: RequestLogContext = {
        method: request.method,
        url: pathname,
        statusCode: response.status,
        duration,
        requestId: correlationContext.requestId,
        userId: correlationContext.userId,
        conversationId: correlationContext.conversationId,
      };

      if (error) {
        config.logger.error(error, `Request failed: ${request.method} ${pathname} - ${response.status} (${duration}ms)`);
      } else if (finalConfig.logSuccessfulRequests) {
        config.logger.request(responseContext, `Request completed: ${request.method} ${pathname} - ${response.status} (${duration}ms)`);
      }

      return response;
    });
  };
}

/**
 * API route wrapper for automatic request logging
 */
export function withRequestLogging<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  logger: TypedLogger,
  options?: {
    operationName?: string;
    logArgs?: boolean;
    logResult?: boolean;
  }
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const operationName = options?.operationName || handler.name || 'anonymous';

    try {
      // Log operation start
      logger.info({
        operation: operationName,
        args: options?.logArgs ? args : undefined,
      }, `Starting operation: ${operationName}`);

      // Execute handler
      const result = await handler(...args);
      const duration = Date.now() - startTime;

      // Log successful completion
      logger.performance({
        operation: operationName,
        duration,
        success: true,
      }, `Operation ${operationName} completed successfully in ${duration}ms`);

      if (options?.logResult) {
        logger.debug({
          operation: operationName,
          result,
        }, `Operation ${operationName} result`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      logger.error(error instanceof Error ? error : new Error('Unknown error'), 
        `Operation ${operationName} failed after ${duration}ms`);
      
      throw error;
    }
  };
}

/**
 * Database operation logging wrapper
 */
export function withDatabaseLogging<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  logger: TypedLogger,
  context: {
    operation: 'select' | 'insert' | 'update' | 'delete' | 'transaction';
    table?: string;
  }
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();

    try {
      const result = await operation(...args);
      const queryTime = Date.now() - startTime;

      logger.database({
        operation: context.operation,
        table: context.table,
        queryTime,
      }, `Database ${context.operation} on ${context.table || 'unknown'} completed in ${queryTime}ms`);

      return result;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      
      logger.error(error instanceof Error ? error : new Error('Database operation failed'), 
        `Database ${context.operation} on ${context.table || 'unknown'} failed after ${queryTime}ms`);
      
      throw error;
    }
  };
}

/**
 * AI operation logging wrapper
 */
export function withAILogging<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  logger: TypedLogger,
  context: {
    model?: string;
    operation?: string;
  }
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();

    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;

      // Try to extract token usage from result if it's an AI response
      let tokenContext = {};
      if (result && typeof result === 'object' && 'usage' in result) {
        const usage = (result as any).usage;
        tokenContext = {
          promptTokens: usage?.prompt_tokens,
          completionTokens: usage?.completion_tokens,
          totalTokens: usage?.total_tokens,
        };
      }

      logger.ai({
        model: context.model,
        duration,
        ...tokenContext,
      }, `AI operation ${context.operation || 'unknown'} completed in ${duration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(error instanceof Error ? error : new Error('AI operation failed'), 
        `AI operation ${context.operation || 'unknown'} failed after ${duration}ms`);
      
      throw error;
    }
  };
}

/**
 * Performance timing utility
 */
export class PerformanceTimer {
  private startTime: number;
  private logger: TypedLogger;
  private operation: string;

  constructor(logger: TypedLogger, operation: string) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = Date.now();
  }

  end(additionalContext?: Record<string, unknown>): void {
    const duration = Date.now() - this.startTime;
    this.logger.performance({
      operation: this.operation,
      duration,
      ...additionalContext,
    }, `${this.operation} completed in ${duration}ms`);
  }

  endWithError(error: Error, additionalContext?: Record<string, unknown>): void {
    const duration = Date.now() - this.startTime;
    this.logger.error(error, `${this.operation} failed after ${duration}ms`);
  }
}

/**
 * Create a performance timer
 */
export function createTimer(logger: TypedLogger, operation: string): PerformanceTimer {
  return new PerformanceTimer(logger, operation);
}
