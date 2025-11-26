# Logging Implementation - API Routes & Memory Tools

This document describes the comprehensive logging implementation for the chat API route and memory tools.

## Overview

Comprehensive structured logging has been added to:
- **Chat API Route** (`src/app/api/chat/route.ts`)
- **Memory Functions** (`src/lib/ai/tools/memory/functions.ts`)

## 1. Chat API Route Logging

### Implemented Logging Points

#### Request Lifecycle
- **Request Start**: Logs when a chat request begins with full context
- **Request Completion**: Logs when AI conversation completes successfully with duration
- **Request Errors**: Comprehensive error logging with performance metrics

#### AI Operations
- **Initialization**: Logs AI conversation setup with model and conversation ID
- **Settings**: Debug logs for feature flags (web search, memory)
- **Completion**: Logs AI response generation with timing

#### Database Operations
- **Conversation Save**: Wrapped in error handling with logging

### Log Examples

```typescript
// Request start
logger.request(
    {
        method: 'POST',
        url: '/api/chat',
        conversationId,
        statusCode: 200,
    },
    'Chat request started'
);

// AI initialization
logger.ai(
    {
        model: 'gpt-5',
        conversationId,
    },
    'Initializing AI conversation'
);

// Success completion
logger.ai(
    {
        model: 'gpt-5',
        conversationId,
        duration,
    },
    'AI conversation completed successfully'
);

// Error handling
logger.error(
    error instanceof Error ? error : new Error(String(error)),
    'Chat request failed'
);

logger.performance(
    {
        operation: 'chat_completion_error',
        duration,
    },
    'Chat request ended with error'
);
```

### Context Tracked

- `conversationId`: Conversation identifier for correlation
- `model`: AI model being used (gpt-5)
- `messageCount`: Number of messages in conversation
- `webSearchEnabled`: Whether web search is enabled
- `memoryEnabled`: Whether memory tools are enabled
- `messagesGenerated`: Number of AI-generated messages
- `duration`: Request/operation duration in milliseconds
- `statusCode`: HTTP status code

## 2. Memory Functions Logging

### Implemented for All Functions

Each memory function now includes:
1. **Start Logging**: Debug log when operation begins with parameters
2. **Validation Logging**: Warning log if schema validation fails
3. **Database Logging**: Info log with operation timing and results
4. **Error Logging**: Comprehensive error handling with stack traces

### Functions with Logging

#### 1. `memoryStoreFunction`
- Logs key, tags count, value length
- Tracks database insert operation timing
- Success/failure logging

```typescript
logger.debug(
    {
        operation: 'memory_store',
        key,
        tagsCount: tags.length,
        valueLength: value.length,
    },
    'Starting memory store operation'
);

logger.database(
    {
        operation: 'insert',
        table: 'memory',
        queryTime: duration,
        rowsAffected: 1,
    },
    `Memory stored successfully: ${key}`
);
```

#### 2. `memoryStoreMultipleFunction`
- Logs batch size
- Tracks parallel embedding generation
- Reports total items processed

```typescript
logger.debug(
    {
        operation: 'memory_store_multiple',
        memoryCount: memoryList.length,
    },
    `Starting batch memory store for ${memoryList.length} items`
);

logger.database(
    {
        operation: 'insert',
        table: 'memory',
        queryTime: duration,
        rowsAffected: memoryEntries.length,
    },
    `Successfully stored ${memoryEntries.length} memories`
);
```

#### 3. `memoryRetrieveFunction`
- Logs query length
- Tracks semantic search performance
- Reports number of results found

```typescript
logger.debug(
    {
        operation: 'memory_retrieve',
        queryLength: embeddingQuery.length,
    },
    'Starting memory retrieval with semantic search'
);

logger.database(
    {
        operation: 'select',
        table: 'memory',
        queryTime: duration,
        rowsAffected: result.length,
    },
    `Memory retrieval completed: found ${result.length} results`
);
```

#### 4. `memoryUpdateFunction`
- Logs key being updated
- Tracks update operation timing
- Success confirmation

```typescript
logger.debug(
    {
        operation: 'memory_update',
        key,
        tagsCount: tags.length,
        valueLength: value.length,
    },
    `Starting memory update for key: ${key}`
);

logger.database(
    {
        operation: 'update',
        table: 'memory',
        queryTime: duration,
        rowsAffected: 1,
    },
    `Memory updated successfully: ${key}`
);
```

#### 5. `memorySemanticSearchFunction`
- Logs query and limit parameters
- Tracks vector search performance
- Reports results with similarity scores

```typescript
logger.debug(
    {
        operation: 'memory_semantic_search',
        queryLength: embeddingQuery.length,
        limit,
    },
    'Starting semantic search of memory'
);

logger.database(
    {
        operation: 'select',
        table: 'memory',
        queryTime: duration,
        rowsAffected: results.length,
    },
    `Semantic search completed: found ${results.length} results`
);
```

#### 6. `memorySearchByTagsFunction`
- Logs tags being searched
- Tracks multi-tag OR search
- Reports matching memories

```typescript
logger.debug(
    {
        operation: 'memory_search_by_tags',
        tags,
        tagsCount: tags.length,
        limit,
    },
    `Starting memory search by tags: ${tags.join(', ')}`
);

logger.database(
    {
        operation: 'select',
        table: 'memory',
        queryTime: duration,
        rowsAffected: results.length,
    },
    `Tag search completed: found ${results.length} memories with tags: ${tags.join(', ')}`
);
```

#### 7. `memorySearchByKeyFunction`
- Logs key pattern and match type (exact/partial)
- Tracks key-based search
- Reports matches found

```typescript
logger.debug(
    {
        operation: 'memory_search_by_key',
        keyPattern,
        exactMatch,
        matchType,
        limit,
    },
    `Starting memory search by key: ${keyPattern} (${matchType} match)`
);

logger.database(
    {
        operation: 'select',
        table: 'memory',
        queryTime: duration,
        rowsAffected: results.length,
    },
    `Key search completed: found ${results.length} memories with ${matchType} match for "${keyPattern}"`
);
```

### Error Handling

Enhanced error handling function with dual logging:

```typescript
const handleError = (error: unknown, operation: string): MemoryResult => {
    // Log to error logger with full error object
    logger.error(
        error instanceof Error ? error : new Error(String(error)),
        `Memory operation failed: ${operation}`
    );
    
    // Log to debug logger with context
    logger.debug(
        {
            table: 'memory',
            error: error instanceof Error ? error.message : String(error),
        },
        `Database error during ${operation}`
    );
    
    return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
    };
};
```

## Log Levels Used

| Level   | Usage                                    | Examples                                      |
|---------|------------------------------------------|-----------------------------------------------|
| `debug` | Detailed operation parameters            | Operation start, settings, configurations     |
| `info`  | Successful operations                    | Database operations, AI completion            |
| `warn`  | Validation failures                      | Schema validation errors                      |
| `error` | Exceptions and failures                  | Database errors, API errors, exceptions       |

## Performance Tracking

All operations track timing:
- Start time captured at function entry
- Duration calculated at completion
- Logged with database context for analysis

```typescript
const startTime = Date.now();
// ... operation ...
const duration = Date.now() - startTime;

logger.database({
    operation: 'select',
    table: 'memory',
    queryTime: duration,
    rowsAffected: results.length,
}, 'Operation completed');
```

## Context Information

### Common Context Fields
- `operation`: Specific memory operation being performed
- `table`: Database table ('memory')
- `queryTime`: Operation duration in milliseconds
- `rowsAffected`: Number of records affected

### Operation-Specific Fields
- **Store**: `key`, `tagsCount`, `valueLength`
- **Retrieve**: `queryLength`, result count
- **Search**: `tags`, `limit`, `keyPattern`, `exactMatch`
- **Update**: `key`, `tagsCount`, `valueLength`

## Correlation Tracking

All logs automatically include correlation context when set:
- `conversationId`: Current conversation
- `requestId`: Request identifier
- `userId`: User identifier

This enables:
- Tracing requests across services
- Filtering logs by conversation
- Debugging specific user sessions

## Benefits

1. **🔍 Comprehensive Debugging**
   - Full visibility into memory operations
   - Track timing and performance
   - Identify bottlenecks

2. **📊 Performance Monitoring**
   - Query timing for all operations
   - Identify slow queries
   - Optimize based on metrics

3. **🚨 Error Tracking**
   - Full error context
   - Stack traces for debugging
   - Operation-specific error details

4. **📈 Analytics**
   - Track memory usage patterns
   - Monitor search performance
   - Identify popular operations

5. **🎯 Production Ready**
   - Structured JSON logs
   - Easy integration with log aggregators
   - Correlation tracking

## Files Modified

1. **`src/app/api/chat/route.ts`**
   - Added logger import
   - Request lifecycle logging
   - AI operation logging
   - Error handling with logging
   - Performance tracking

2. **`src/lib/ai/tools/memory/functions.ts`**
   - Added logger import
   - Enhanced error handling function
   - Logging for all 7 memory functions
   - Performance timing for all operations
   - Validation failure logging

## Viewing Logs

### Development
- Logs appear in terminal/console
- Structured JSON format (or pretty-printed if configured)
- Real-time visibility into operations

### Production
- Logs sent to centralized log aggregation
- Queryable by conversation ID, operation, etc.
- Performance metrics available for analysis

## Example Log Flow

### Complete Memory Store Operation

```json
// 1. Debug: Operation start
{
  "level": "debug",
  "operation": "memory_store",
  "key": "user_location",
  "tagsCount": 2,
  "valueLength": 25,
  "message": "Starting memory store operation"
}

// 2. Info: Database operation
{
  "level": "info",
  "operation": "insert",
  "table": "memory",
  "queryTime": 45,
  "rowsAffected": 1,
  "message": "Memory stored successfully: user_location"
}
```

### Complete Chat Request

```json
// 1. Request start
{
  "level": "info",
  "method": "POST",
  "url": "/api/chat",
  "conversationId": "conv_abc123",
  "statusCode": 200,
  "message": "Chat request started"
}

// 2. AI initialization
{
  "level": "info",
  "model": "gpt-5",
  "conversationId": "conv_abc123",
  "message": "Initializing AI conversation"
}

// 3. Settings debug
{
  "level": "debug",
  "messageCount": 5,
  "webSearchEnabled": true,
  "memoryEnabled": true,
  "message": "AI conversation settings"
}

// 4. Completion
{
  "level": "info",
  "model": "gpt-5",
  "conversationId": "conv_abc123",
  "duration": 2500,
  "message": "AI conversation completed successfully"
}
```

## Next Steps

Future enhancements could include:
1. Token usage tracking for cost analysis
2. Memory embedding performance metrics
3. Search relevance scoring logs
4. Rate limiting and quota tracking
5. External service integration (DataDog, Sentry, etc.)

---

## ✅ Completion Summary

- ✅ Comprehensive logging for chat API route
- ✅ Complete logging for all 7 memory functions
- ✅ Performance timing for all operations
- ✅ Error handling with context
- ✅ Validation failure logging
- ✅ Type-safe logging (no linter errors)
- ✅ Production-ready structured logging

All logging follows the established Pino-based logging system with typed contexts and correlation tracking!



