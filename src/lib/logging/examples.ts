/**
 * Example configurations and usage patterns for the Moach logging system
 * 
 * These examples demonstrate how to use the logging system in different
 * scenarios and environments.
 */

import { 
  createLogger, 
  createBackendLogger, 
  createFrontendLogger, 
  createEdgeLogger,
  withRequestLogging,
  withDatabaseLogging,
  withAILogging,
  createTimer,
  withCorrelationAsync,
  createCorrelationContext,
  type LoggerConfig,
  type TypedLogger
} from './index';

// ============================================================================
// Basic Usage Examples
// ============================================================================

/**
 * Example 1: Basic logging in different environments
 */
export function basicLoggingExample() {
  // Auto-detecting environment logger
  const logger = createLogger({
    serviceName: 'moach-example',
    level: 'info',
  });

  // Basic logging
  logger.info('Application started');
  logger.warn('This is a warning');
  logger.error(new Error('Something went wrong'), 'Error occurred');

  // Structured logging with context
  logger.info({
    userId: 'user_123',
    action: 'login',
    timestamp: new Date().toISOString(),
  }, 'User logged in successfully');
}

/**
 * Example 2: Environment-specific loggers
 */
export function environmentSpecificLoggers() {
  // Backend logger with pretty printing for development
  const backendLogger = createBackendLogger({
    level: 'debug',
    environment: 'nodejs',
    serviceName: 'moach-backend',
    prettyPrint: process.env.NODE_ENV === 'development',
  });

  // Frontend logger with log transmission
  const frontendLogger = createFrontendLogger(
    {
      level: 'info',
      environment: 'browser',
      serviceName: 'moach-frontend',
    },
    {
      endpoint: '/api/logs',
      batchSize: 5,
      flushInterval: 3000,
    }
  );

  // Edge logger with minimal configuration
  const edgeLogger = createEdgeLogger({
    level: 'info',
    environment: 'edge',
    serviceName: 'moach-edge',
    logEndpoint: process.env.LOG_ENDPOINT,
  });

  return { backendLogger, frontendLogger, edgeLogger };
}

// ============================================================================
// Typed Context Logging Examples
// ============================================================================

/**
 * Example 3: Request logging
 */
export function requestLoggingExample(logger: TypedLogger) {
  // Log incoming request
  logger.request({
    method: 'POST',
    url: '/api/chat',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ip: '192.168.1.100',
    userId: 'user_123',
    requestId: 'req_abc123',
  }, 'Processing chat request');

  // Log request completion
  logger.request({
    method: 'POST',
    url: '/api/chat',
    statusCode: 200,
    duration: 150,
    userId: 'user_123',
    requestId: 'req_abc123',
  }, 'Chat request completed successfully');
}

/**
 * Example 4: Database operation logging
 */
export function databaseLoggingExample(logger: TypedLogger) {
  logger.database({
    operation: 'select',
    table: 'conversations',
    queryTime: 45,
    rowsAffected: 1,
    userId: 'user_123',
  }, 'Retrieved conversation history');

  logger.database({
    operation: 'insert',
    table: 'messages',
    queryTime: 12,
    rowsAffected: 1,
    conversationId: 'conv_abc',
  }, 'Saved new message to database');
}

/**
 * Example 5: AI operation logging
 */
export function aiLoggingExample(logger: TypedLogger) {
  logger.ai({
    model: 'gpt-4',
    promptTokens: 150,
    completionTokens: 75,
    totalTokens: 225,
    duration: 2500,
    cost: 0.045,
    conversationId: 'conv_abc',
  }, 'AI response generated successfully');

  logger.ai({
    model: 'gpt-3.5-turbo',
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    duration: 1200,
    cost: 0.015,
    conversationId: 'conv_def',
  }, 'Quick AI response completed');
}

/**
 * Example 6: Error logging with context
 */
export function errorLoggingExample(logger: TypedLogger) {
  // Log with Error object
  try {
    throw new Error('Database connection failed');
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error('Unknown error'), 
      'Failed to connect to database');
  }

  // Log with error context
  logger.error({
    errorType: 'ValidationError',
    stack: 'Error: Invalid email format\n    at validateEmail...',
    errorMeta: {
      field: 'email',
      value: 'invalid-email',
      userId: 'user_123',
    },
  }, 'User input validation failed');
}

/**
 * Example 7: Performance logging
 */
export function performanceLoggingExample(logger: TypedLogger) {
  logger.performance({
    operation: 'image_processing',
    duration: 1250,
    memoryUsage: 1024 * 1024 * 50, // 50MB
    cpuUsage: 85.5,
    userId: 'user_123',
  }, 'Image processing completed');

  logger.performance({
    operation: 'database_migration',
    duration: 45000,
    memoryUsage: 1024 * 1024 * 200, // 200MB
    userId: 'admin_456',
  }, 'Database migration completed successfully');
}

/**
 * Example 8: Security event logging
 */
export function securityLoggingExample(logger: TypedLogger) {
  logger.security({
    eventType: 'auth_failure',
    sourceIp: '192.168.1.100',
    securityMeta: {
      attempts: 3,
      reason: 'invalid_password',
      username: 'john.doe',
    },
  }, 'Multiple failed login attempts detected');

  logger.security({
    eventType: 'suspicious_activity',
    sourceIp: '10.0.0.50',
    userId: 'user_789',
    securityMeta: {
      action: 'rapid_api_calls',
      count: 100,
      timeWindow: '1 minute',
    },
  }, 'Suspicious API activity detected');
}

// ============================================================================
// Middleware and Wrapper Examples
// ============================================================================

/**
 * Example 9: API route with request logging
 */
export const chatApiHandler = withRequestLogging(
  async (request: any, context: any) => {
    // Simulate API processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      message: 'Chat processed successfully',
      tokens: 150,
    };
  },
  createLogger({ serviceName: 'chat-api' }),
  {
    operationName: 'chat_completion',
    logArgs: false,
    logResult: true,
  }
);

/**
 * Example 10: Database operation with logging
 */
export const getUserById = withDatabaseLogging(
  async (userId: string) => {
    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
    };
  },
  createLogger({ serviceName: 'user-service' }),
  {
    operation: 'select',
    table: 'users',
  }
);

/**
 * Example 11: AI operation with logging
 */
export const generateAIResponse = withAILogging(
  async (prompt: string) => {
    // Simulate AI API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      choices: [{ message: { content: 'AI generated response' } }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    };
  },
  createLogger({ serviceName: 'ai-service' }),
  {
    model: 'gpt-4',
    operation: 'chat_completion',
  }
);

// ============================================================================
// Performance Monitoring Examples
// ============================================================================

/**
 * Example 12: Manual performance timing
 */
export async function manualTimingExample(logger: TypedLogger) {
  const timer = createTimer(logger, 'data_processing');
  
  try {
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    timer.end({
      recordsProcessed: 1000,
      success: true,
    });
  } catch (error) {
    timer.endWithError(
      error instanceof Error ? error : new Error('Processing failed'),
      { recordsProcessed: 500 }
    );
  }
}

/**
 * Example 13: Automatic performance measurement
 */
export async function automaticTimingExample() {
  const logger = createLogger({ serviceName: 'performance-example' });
  
  // Time a function automatically
  const processData = async (data: any[]) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return data.map(item => ({ ...item, processed: true }));
  };

  const timedProcessData = withRequestLogging(
    processData,
    logger,
    { operationName: 'process_data_batch' }
  );

  const result = await timedProcessData([{ id: 1 }, { id: 2 }]);
  return result;
}

// ============================================================================
// Correlation Tracking Examples
// ============================================================================

/**
 * Example 14: Request correlation tracking
 */
export async function correlationTrackingExample() {
  const logger = createLogger({ serviceName: 'correlation-example' });
  
  // Create correlation context
  const context = createCorrelationContext({
    userId: 'user_123',
    conversationId: 'conv_abc',
  });

  // Execute operations within correlation context
  await withCorrelationAsync(context, async () => {
    // All logs within this scope will include correlation data
    logger.info('Starting user request processing');
    
    // Simulate multiple operations
    await processUserData();
    await saveToDatabase();
    await sendNotification();
    
    logger.info('User request processing completed');
  });

  async function processUserData() {
    logger.info('Processing user data');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async function saveToDatabase() {
    logger.database({
      operation: 'insert',
      table: 'user_actions',
      queryTime: 25,
    }, 'Saved user action to database');
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  async function sendNotification() {
    logger.info('Sending notification to user');
    await new Promise(resolve => setTimeout(resolve, 30));
  }
}

/**
 * Example 15: Child logger with context
 */
export function childLoggerExample() {
  const logger = createLogger({ serviceName: 'parent-service' });
  
  // Create child logger with additional context
  const userLogger = logger.withContext({
    userId: 'user_123',
    sessionId: 'session_abc',
  });

  // All logs from child logger will include the context
  userLogger.info('User session started');
  userLogger.request({
    method: 'GET',
    url: '/api/profile',
  }, 'Loading user profile');
  userLogger.info('User session ended');
}

// ============================================================================
// Production Configuration Examples
// ============================================================================

/**
 * Example 16: Production logger configuration
 */
export function productionLoggerConfig(): LoggerConfig {
  return {
    level: 'info',
    environment: 'nodejs',
    serviceName: 'moach-production',
    prettyPrint: false,
    pinoConfig: {
      // Redact sensitive fields
      redact: {
        paths: ['password', 'token', 'apiKey', 'secret'],
        censor: '[REDACTED]',
      },
      // Custom serializers for security
      serializers: {
        req: (req: any) => ({
          method: req.method,
          url: req.url,
          // Remove sensitive headers
          headers: Object.fromEntries(
            Object.entries(req.headers || {}).filter(([key]) => 
              !['authorization', 'cookie', 'x-api-key'].includes(key.toLowerCase())
            )
          ),
        }),
        user: (user: any) => ({
          id: user.id,
          // Mask email
          email: user.email?.replace(/(.{2}).*(@.*)/, '$1***$2'),
        }),
      },
    },
  };
}

/**
 * Example 17: Development logger configuration
 */
export function developmentLoggerConfig(): LoggerConfig {
  return {
    level: 'debug',
    environment: 'nodejs',
    serviceName: 'moach-development',
    prettyPrint: true,
    pinoConfig: {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
    },
  };
}

// ============================================================================
// Integration Examples
// ============================================================================

/**
 * Example 18: Next.js API route integration
 */
export function nextApiRouteExample() {
  const logger = createLogger({ serviceName: 'next-api' });

  return async function handler(req: any, res: any) {
    const timer = createTimer(logger, 'api_request');
    
    try {
      logger.request({
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
      }, `Processing ${req.method} request to ${req.url}`);

      // Your API logic here
      const result = await processApiRequest(req);

      timer.end({
        statusCode: 200,
        success: true,
      });

      res.status(200).json(result);
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error('API error'), 
        'API request failed');
      
      timer.endWithError(
        error instanceof Error ? error : new Error('API error'),
        { statusCode: 500 }
      );

      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  async function processApiRequest(req: any) {
    // Simulate API processing
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true };
  }
}

/**
 * Example 19: Frontend error boundary integration
 */
export function frontendErrorBoundaryExample() {
  const logger = createLogger({ serviceName: 'frontend-errors' });

  return class ErrorBoundary extends Error {
    static getDerivedStateFromError(error: Error) {
      logger.error({
        errorType: 'react_error_boundary',
        stack: error.stack,
        errorMeta: {
          componentStack: 'Component stack would be here',
        },
      }, `React error boundary caught error: ${error.message}`);

      return { hasError: true };
    }
  };
}
