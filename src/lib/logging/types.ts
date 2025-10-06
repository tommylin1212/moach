import type { Logger } from 'pino';

/**
 * Log levels supported by the logging system
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Runtime environment types
 */
export type RuntimeEnvironment = 'nodejs' | 'browser' | 'edge';

/**
 * Base context that should be included in all logs
 */
export interface BaseLogContext {
  /** Unique request/operation identifier for correlation */
  requestId?: string;
  /** User identifier if available */
  userId?: string;
  /** Conversation identifier for chat operations */
  conversationId?: string;
  /** Service or component name */
  service?: string;
  /** Environment (development, production, etc.) */
  environment?: string;
  /** Additional metadata */
  sessionId?: string;
}

/**
 * Extended context for HTTP requests
 */
export interface RequestLogContext extends BaseLogContext {
  /** HTTP method */
  method?: string;
  /** Request URL or path */
  url?: string;
  /** User agent string */
  userAgent?: string;
  /** Client IP address */
  ip?: string;
  /** Request duration in milliseconds */
  duration?: number;
  /** HTTP status code */
  statusCode?: number;
}

/**
 * Context for database operations
 */
export interface DatabaseLogContext extends BaseLogContext {
  /** Database operation type */
  operation: 'select' | 'insert' | 'update' | 'delete' | 'transaction';
  /** Table or collection name */
  table?: string;
  /** Query execution time in milliseconds */
  queryTime?: number;
  /** Number of rows affected */
  rowsAffected?: number;
}

/**
 * Context for AI operations
 */
export interface AILogContext extends BaseLogContext {
  /** AI model being used */
  model?: string;
  /** Number of tokens in prompt */
  promptTokens?: number;
  /** Number of tokens in completion */
  completionTokens?: number;
  /** Total tokens used */
  totalTokens?: number;
  /** Operation duration in milliseconds */
  duration?: number;
  /** Cost in USD if available */
  cost?: number;
}

/**
 * Context for error logging
 */
export interface ErrorLogContext extends BaseLogContext {
  /** Error name/type */
  errorType?: string;
  /** Error stack trace */
  stack?: string;
  /** Additional error metadata */
  errorMeta?: Record<string, unknown>;
}

/**
 * Performance metrics context
 */
export interface PerformanceLogContext extends BaseLogContext, ErrorLogContext {
  /** Operation name */
  operation: string;
  /** Duration in milliseconds */
  duration: number;
  /** Memory usage in bytes */
  memoryUsage?: number;
  /** CPU usage percentage */
  cpuUsage?: number;
  /** Success flag */
  success?: boolean;


}

/**
 * Security event context
 */
export interface SecurityLogContext extends BaseLogContext {
  /** Type of security event */
  eventType: 'auth_success' | 'auth_failure' | 'suspicious_activity' | 'rate_limit' | 'access_denied';
  /** Source IP address */
  sourceIp?: string;
  /** Additional security metadata */
  securityMeta?: Record<string, unknown>;
}

/**
 * Configuration for different logger instances
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Runtime environment */
  environment: RuntimeEnvironment;
  /** Service name for identification */
  serviceName: string;
  /** Whether to enable pretty printing (development) */
  prettyPrint?: boolean;
  /** External log endpoint for transmission */
  logEndpoint?: string;
  /** Additional Pino configuration */
  pinoConfig?: Record<string, unknown>;
}

/**
 * Log transmission configuration for frontend/edge
 */
export interface LogTransmissionConfig {
  /** Backend endpoint to send logs to */
  endpoint: string;
  /** Batch size for log transmission */
  batchSize?: number;
  /** Flush interval in milliseconds */
  flushInterval?: number;
  /** Maximum retries for failed transmissions */
  maxRetries?: number;
  /** Whether to use keepalive for requests */
  keepalive?: boolean;
}

/**
 * Enhanced logger interface with typed context methods
 */
export interface TypedLogger extends Logger {
  /** Log with request context */
  request: (context: RequestLogContext, message: string, ...args: unknown[]) => void;
  
  /** Log with database context */
  database: (context: DatabaseLogContext, message: string, ...args: unknown[]) => void;
  
  /** Log with AI operation context */
  ai: (context: AILogContext, message: string, ...args: unknown[]) => void;
  
  /** Log with error context */
  error: (context: ErrorLogContext | Error, message?: string, ...args: unknown[]) => void;
  
  /** Log with performance context */
  performance: (context: PerformanceLogContext, message: string, ...args: unknown[]) => void;
  
  /** Log with security context */
  security: (context: SecurityLogContext, message: string, ...args: unknown[]) => void;
  
  /** Create child logger with additional context */
  withContext: (context: BaseLogContext) => TypedLogger;
}

/**
 * Log entry structure for transmission
 */
export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: Record<string, unknown>;
  source: RuntimeEnvironment;
  service: string;
}

/**
 * Correlation tracking interface
 */
export interface CorrelationContext {
  requestId: string;
  userId?: string;
  conversationId?: string;
  parentRequestId?: string;
}
