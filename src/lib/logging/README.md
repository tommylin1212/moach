# Moach Logging System

A comprehensive, high-performance logging solution built on Pino that works seamlessly across backend (Node.js), frontend (Browser), and edge runtime environments.

## Features

- 🚀 **High Performance**: Built on Pino, the fastest JSON logger for Node.js
- 🔄 **Multi-Environment**: Works in Node.js, Browser, and Edge Runtime
- 🔗 **Request Correlation**: Track requests across services with correlation IDs
- 📊 **Structured Logging**: JSON-based logs with typed contexts
- 🎯 **Typed API**: Full TypeScript support with context-specific logging methods
- 🛡️ **Security**: Built-in data masking and secure logging practices
- 📈 **Performance Monitoring**: Built-in timing and performance tracking
- 🔧 **Configurable**: Flexible configuration for different environments

## Quick Start

```typescript
import logger from '@/lib/logger';

// Basic logging
logger.info('Application started');
logger.error(error, 'Something went wrong');

// Typed context logging
logger.request({ method: 'GET', url: '/api/users' }, 'Processing request');
logger.database({ operation: 'select', table: 'users' }, 'Querying users');
logger.ai({ model: 'gpt-4', promptTokens: 100 }, 'AI request completed');
```

## Architecture

```text
┌─────────────────┬─────────────────┬─────────────────┐
│    Frontend     │     Backend     │   Edge Runtime  │
│   (Browser)     │   (Node.js)     │  (Serverless)   │
├─────────────────┼─────────────────┼─────────────────┤
│ Pino Browser    │ Pino Core       │ Pino Minimal    │
│ + HTTP Transport│ + File/Console  │ + HTTP Transport│
│ + Error Capture │ + Correlation   │ + Performance   │
└─────────────────┴─────────────────┴─────────────────┘
                           │
                           ▼
                 ┌─────────────────┐
                 │ Centralized     │
                 │ Log Aggregation │
                 │ (/api/logs)     │
                 └─────────────────┘
```

## Environment-Specific Usage

### Backend (Node.js)

```typescript
import { createBackendLogger } from '@/lib/logging';

const logger = createBackendLogger({
  level: 'info',
  environment: 'nodejs',
  serviceName: 'moach-api',
  prettyPrint: process.env.NODE_ENV === 'development',
});

// High-performance mode (with potential log loss risk)
import { createHighPerformanceLogger } from '@/lib/logging';
const perfLogger = createHighPerformanceLogger(config);
```

### Frontend (Browser)

```typescript
import { createFrontendLogger } from '@/lib/logging';

const logger = createFrontendLogger(
  {
    level: 'info',
    environment: 'browser',
    serviceName: 'moach-frontend',
  },
  {
    endpoint: '/api/logs',
    batchSize: 10,
    flushInterval: 5000,
  }
);

// With automatic error capture
import { createFrontendLoggerWithErrorCapture } from '@/lib/logging';
const logger = createFrontendLoggerWithErrorCapture(config, transmissionConfig);
```

### Edge Runtime

```typescript
import { createEdgeLogger } from '@/lib/logging';

const logger = createEdgeLogger({
  level: 'info',
  environment: 'edge',
  serviceName: 'moach-edge',
  logEndpoint: process.env.LOG_ENDPOINT,
});

// Adaptive logger (auto-detects environment)
import { createAdaptiveLogger } from '@/lib/logging';
const logger = createAdaptiveLogger(config);
```

## Typed Logging Contexts

### Request Logging

```typescript
logger.request({
  method: 'POST',
  url: '/api/chat',
  userAgent: 'Mozilla/5.0...',
  ip: '192.168.1.1',
  duration: 150,
  statusCode: 200,
  userId: 'user_123',
  requestId: 'req_abc',
}, 'Chat request processed');
```

### Database Logging

```typescript
logger.database({
  operation: 'select',
  table: 'conversations',
  queryTime: 45,
  rowsAffected: 1,
}, 'Retrieved conversation history');
```

### AI Operations

```typescript
logger.ai({
  model: 'gpt-4',
  promptTokens: 150,
  completionTokens: 75,
  totalTokens: 225,
  duration: 2500,
  cost: 0.045,
}, 'AI response generated');
```

### Error Logging

```typescript
// With Error object
logger.error(new Error('Database connection failed'), 'Failed to connect to database');

// With context
logger.error({
  errorType: 'ValidationError',
  stack: error.stack,
  errorMeta: { field: 'email', value: 'invalid' },
}, 'User input validation failed');
```

### Performance Logging

```typescript
logger.performance({
  operation: 'image_processing',
  duration: 1250,
  memoryUsage: 1024 * 1024 * 50, // 50MB
  cpuUsage: 85.5,
}, 'Image processing completed');
```

### Security Events

```typescript
logger.security({
  eventType: 'auth_failure',
  sourceIp: '192.168.1.100',
  securityMeta: { attempts: 3, reason: 'invalid_password' },
}, 'Multiple failed login attempts detected');
```

## Request Correlation

Track requests across services and components:

```typescript
import { withCorrelationAsync, createCorrelationContext } from '@/lib/logging';

// Create correlation context
const context = createCorrelationContext({
  userId: 'user_123',
  conversationId: 'conv_abc',
});

// Execute with correlation
await withCorrelationAsync(context, async () => {
  // All logs within this scope will include correlation data
  logger.info('Processing user request');
  await processUserRequest();
});

// Get current correlation data
import { getCorrelationData } from '@/lib/logging';
const correlationData = getCorrelationData();
```

## Middleware Integration

### Next.js Middleware

```typescript
// middleware.ts
import { createNextMiddleware } from '@/lib/logging';
import logger from '@/lib/logger';

export const middleware = createNextMiddleware({
  logger,
  logRequestBody: false,
  logResponseBody: false,
  excludePaths: ['/favicon.ico', '/_next'],
});

export const config = {
  matcher: ['/api/:path*'],
};
```

### API Route Wrapper

```typescript
import { withRequestLogging } from '@/lib/logging';
import logger from '@/lib/logger';

const handler = withRequestLogging(
  async (req, res) => {
    // Your API logic here
    return { success: true };
  },
  logger,
  {
    operationName: 'chat_completion',
    logArgs: false,
    logResult: true,
  }
);

export { handler as POST };
```

### Database Operations

```typescript
import { withDatabaseLogging } from '@/lib/logging';
import logger from '@/lib/logger';

const getUser = withDatabaseLogging(
  async (userId: string) => {
    return await db.select().from(users).where(eq(users.id, userId));
  },
  logger,
  { operation: 'select', table: 'users' }
);
```

### AI Operations

```typescript
import { withAILogging } from '@/lib/logging';
import logger from '@/lib/logger';

const generateResponse = withAILogging(
  async (prompt: string) => {
    return await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });
  },
  logger,
  { model: 'gpt-4', operation: 'chat_completion' }
);
```

## Performance Monitoring

### Manual Timing

```typescript
import { createTimer } from '@/lib/logging';

const timer = createTimer(logger, 'data_processing');
try {
  await processData();
  timer.end({ recordsProcessed: 1000 });
} catch (error) {
  timer.endWithError(error, { recordsProcessed: 500 });
}
```

### Automatic Timing

```typescript
// Edge runtime performance logger
import { createEdgePerformanceLogger } from '@/lib/logging';

const logger = createEdgePerformanceLogger(config);

// Time a function
const result = await logger.measure('api_call', async () => {
  return await fetch('/external-api');
}, { endpoint: '/external-api' });

// Manual timing
const timer = logger.time('operation');
await doSomething();
timer.end({ success: true });
```

## Configuration

### Environment Variables

```bash
# Log level (trace, debug, info, warn, error, fatal)
LOG_LEVEL=info

# External log endpoint for edge runtime
LOG_ENDPOINT=https://logs.example.com/ingest

# Service name
SERVICE_NAME=moach

# Environment
NODE_ENV=production
```

### Advanced Configuration

```typescript
import { createLogger } from '@/lib/logging';

const logger = createLogger({
  level: 'debug',
  serviceName: 'my-service',
  prettyPrint: true,
  logEndpoint: 'https://my-log-service.com/logs',
  pinoConfig: {
    // Additional Pino configuration
    redact: ['password', 'token'],
  },
});
```

## Security Considerations

### Data Masking

```typescript
// Automatic masking in serializers
const logger = createBackendLogger({
  // ... other config
  pinoConfig: {
    serializers: {
      user: (user) => ({
        id: user.id,
        email: user.email?.replace(/(.{2}).*(@.*)/, '$1***$2'),
        // Never log passwords
      }),
    },
  },
});
```

### Secure Headers

```typescript
// Remove sensitive headers from request logs
const logger = createBackendLogger({
  pinoConfig: {
    serializers: {
      req: (req) => ({
        ...pino.stdSerializers.req(req),
        headers: Object.fromEntries(
          Object.entries(req.headers).filter(([key]) => 
            !['authorization', 'cookie', 'x-api-key'].includes(key.toLowerCase())
          )
        ),
      }),
    },
  },
});
```

## Best Practices

1. **Use Correlation IDs**: Always include correlation context for request tracking
2. **Structured Data**: Use typed contexts instead of string interpolation
3. **Performance Monitoring**: Log operation durations for performance insights
4. **Error Context**: Include relevant context with error logs
5. **Security Events**: Log authentication and authorization events
6. **Data Privacy**: Mask or exclude sensitive information from logs
7. **Log Levels**: Use appropriate log levels (error for errors, info for normal operations)
8. **Batch Frontend Logs**: Use batching to reduce network overhead

## Debugging and Troubleshooting

### Common Issues

1. **Edge Runtime Compatibility**: Some Pino features may not work in edge runtime
   - Solution: Use `createEdgeLogger` or `createAdaptiveLogger`

2. **Frontend Log Transmission Failures**: Network issues preventing log delivery
   - Solution: Logs fallback to console automatically

3. **Performance Impact**: High-frequency logging affecting performance
   - Solution: Use appropriate log levels and consider `createHighPerformanceLogger`

4. **Memory Usage**: Log queuing consuming memory in frontend
   - Solution: Adjust `batchSize` and `flushInterval` in transmission config

### Debug Mode

```typescript
// Enable debug logging
const logger = createLogger({
  level: 'debug',
  prettyPrint: true,
});

// Check current configuration
console.log('Logger config:', logger.level);
```

## Migration Guide

### From Console Logging

```typescript
// Before
console.log('User logged in:', userId);
console.error('Database error:', error);

// After
logger.info({ userId }, 'User logged in');
logger.error(error, 'Database error occurred');
```

### From Other Logging Libraries

```typescript
// From Winston
// Before: winston.info('message', { metadata })
// After: logger.info({ metadata }, 'message')

// From Bunyan
// Before: bunyan.info({ data }, 'message')
// After: logger.info({ data }, 'message') // Same format!
```

## Performance Benchmarks

- **Backend**: ~6x faster than Winston, ~3x faster than Bunyan
- **Frontend**: Minimal overhead with batched transmission
- **Edge**: <1ms overhead per log entry
- **Memory**: ~50% less memory usage compared to Winston

## External Integrations

### AppSignal

```typescript
import { createLoggerWithTransports } from '@/lib/logging';

const logger = createLoggerWithTransports(config, [
  {
    target: '@appsignal/nodejs/pino',
    options: { group: 'moach-logs' },
  },
]);
```

### Datadog

```typescript
const logger = createLoggerWithTransports(config, [
  {
    target: 'pino-datadog',
    options: {
      apiKey: process.env.DATADOG_API_KEY,
      service: 'moach',
    },
  },
]);
```

## Contributing

When adding new logging contexts or features:

1. Update type definitions in `types.ts`
2. Add corresponding methods to logger implementations
3. Update this documentation
4. Add tests for new functionality
5. Consider backward compatibility
