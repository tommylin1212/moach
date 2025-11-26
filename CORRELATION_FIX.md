# Correlation Context Browser Compatibility Fix

## Problem

The logging system was importing `async_hooks` from Node.js in the correlation module:

```typescript
import { AsyncLocalStorage } from 'async_hooks';
```

This caused a build error when client components tried to import the logger:

```
Module not found: Can't resolve 'async_hooks'
```

The `async_hooks` module is Node.js-specific and not available in browser environments.

## Solution

Implemented an **environment-aware correlation storage system** that automatically adapts to the runtime:

### 1. Storage Interface

Created a common interface for both implementations:

```typescript
interface CorrelationStorage {
  getStore(): CorrelationContext | undefined;
  run<T>(context: CorrelationContext, fn: () => T): T;
}
```

### 2. Browser Implementation

Uses **sessionStorage** for persistence across the application:

```typescript
class BrowserCorrelationStorage implements CorrelationStorage {
  private store: CorrelationContext | undefined;
  private readonly storageKey = 'moach_correlation_context';

  // Loads from sessionStorage for persistence
  // Saves to sessionStorage when context changes
  // Falls back to in-memory if sessionStorage unavailable
}
```

**Benefits:**
- ✅ Persists across page reloads
- ✅ Shared across browser tabs in the same session
- ✅ No external dependencies
- ✅ Graceful fallback

### 3. Node.js Implementation

Dynamically requires `async_hooks` only when in Node.js:

```typescript
class NodeCorrelationStorage implements CorrelationStorage {
  private asyncLocalStorage: any;

  constructor() {
    if (typeof window === 'undefined') {
      try {
        const { AsyncLocalStorage } = require('async_hooks');
        this.asyncLocalStorage = new AsyncLocalStorage();
      } catch {
        this.asyncLocalStorage = null;
      }
    }
  }
  // Uses AsyncLocalStorage for proper async context tracking
}
```

**Benefits:**
- ✅ Full async context tracking in Node.js
- ✅ No static imports (uses dynamic require)
- ✅ Graceful fallback if async_hooks unavailable
- ✅ Works in Edge Runtime

### 4. Automatic Detection

The system automatically detects the environment and uses the appropriate implementation:

```typescript
function createCorrelationStorage(): CorrelationStorage {
  if (typeof window === 'undefined') {
    return new NodeCorrelationStorage();  // Server-side
  } else {
    return new BrowserCorrelationStorage(); // Client-side
  }
}
```

## New Features Added

### 1. `setCorrelationContext()` Function

Easily set correlation context in the browser:

```typescript
import { setCorrelationContext } from '@/lib/logger';

setCorrelationContext({ 
  conversationId: 'conv_123',
  userId: 'user_456' 
});
```

This is automatically used in `page.tsx` to track the current conversation:

```typescript
// Update correlation context when conversation changes
useEffect(() => {
  if (currentConversationId) {
    setCorrelationContext({ conversationId: currentConversationId });
  }
}, [currentConversationId]);
```

### 2. Automatic Conversation Tracking

All logs now automatically include the current `conversationId` from the correlation context, making it easy to:
- Filter logs by conversation
- Debug specific conversation flows
- Track user journeys across components

## Additional Fix: Middleware Module

### Problem 2: pino-http Import Error

After fixing `async_hooks`, another issue appeared:
```
Runtime TypeError: Cannot read properties of undefined (reading 'stringifySym')
```

This was caused by `pino-http` being statically imported in `middleware.ts`, which then got bundled into client code.

### Solution: Dynamic Import with Guards

Made `pino-http` load conditionally:

```typescript
// Dynamic import for server-side only
let pinoHttp: any = null;
if (typeof window === 'undefined') {
  try {
    pinoHttp = require('pino-http');
  } catch {
    // pino-http not available, middleware will be no-op
  }
}

// Guard the function
export function createPinoHttpMiddleware(logger: TypedLogger) {
  if (!pinoHttp) {
    // Return a no-op middleware for browser/when pino-http unavailable
    return (req: any, res: any, next: any) => next?.();
  }
  
  return pinoHttp({ /* ... */ });
}
```

## Additional Fix: API Route Worker Error

### Problem 3: Worker Thread Error in Logs Route

After fixing the previous issues, another error appeared in the logs API route:
```
uncaughtException: Error: the worker has exited
   at logFrontendEntry (src/app/api/logs/route.ts:73:25)
```

This was caused by `pino-pretty` (enabled via `prettyPrint: true`) spawning a worker thread that would exit unexpectedly in Next.js API routes, especially during hot reloading.

### Solution: Disable Pretty Print in API Routes

```typescript
// ❌ Before: Pretty print enabled (causes worker thread issues)
const frontendLogHandler = createBackendLogger({
  level: 'trace',
  environment: 'nodejs',
  serviceName: 'moach-frontend-logs',
  prettyPrint: process.env.NODE_ENV === 'development', // ❌ Worker threads!
});

// ✅ After: Pretty print disabled for stability
const frontendLogHandler = createBackendLogger({
  level: 'trace',
  environment: 'nodejs',
  serviceName: 'moach-frontend-logs',
  prettyPrint: false, // ✅ No worker threads, JSON output
});
```

Additionally, added error handling to prevent logger failures from crashing the API:

```typescript
function logFrontendEntry(entry: LogEntry): void {
  try {
    // ... logging logic
  } catch (error) {
    // Fallback to console if logger fails
    console.error('[LOG HANDLER ERROR]', error);
    console.log('[FRONTEND LOG]', entry.level, entry.message, entry.context);
  }
}
```

## Testing the Fix

### Before (Errors):
```
1. Module not found: Can't resolve 'async_hooks'
   Client Component Browser: ./src/lib/logging/correlation.ts

2. Runtime TypeError: Cannot read properties of undefined (reading 'stringifySym')
   src/lib/logging/middleware.ts

3. uncaughtException: Error: the worker has exited
   at logFrontendEntry (src/app/api/logs/route.ts:73:25)
```

### After (Working):
```
✓ No build errors
✓ No runtime errors
✓ Logging works in both browser and Node.js
✓ Correlation context persists across page reloads
✓ All logs include conversationId automatically
✓ Middleware functions work on server, no-op on client
✓ API route handles logs without worker thread errors
✓ Graceful fallback to console on logger failures
```

## Files Modified

1. **`src/lib/logging/correlation.ts`**
   - Removed static `async_hooks` import
   - Added environment-aware storage implementations
   - Added `setCorrelationContext()` helper function
   - Added sessionStorage persistence for browser

2. **`src/lib/logging/middleware.ts`**
   - Removed static `pino-http` import
   - Added dynamic require with environment check
   - Added no-op fallback for browser environment
   - Fixed TypeScript annotations

3. **`src/app/api/logs/route.ts`**
   - Disabled `prettyPrint` to prevent worker thread issues
   - Added try-catch error handling in `logFrontendEntry`
   - Added console fallback for logger failures

4. **`src/lib/logging/index.ts`**
   - Exported `setCorrelationContext`

5. **`src/lib/logger.ts`**
   - Re-exported `setCorrelationContext`

6. **`src/app/page.tsx`**
   - Integrated correlation context tracking
   - Automatically sets conversationId on all logs

7. **`LOGGING_IMPLEMENTATION.md`**
   - Updated documentation with correlation context usage
   - Added browser compatibility notes

## Architecture

```
┌─────────────────────────────────────────────────┐
│          Correlation Context System             │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐         ┌─────────────────┐  │
│  │   Browser    │         │    Node.js      │  │
│  │              │         │                 │  │
│  │ sessionStorage│         │ AsyncLocalStorage│ │
│  │ + In-Memory  │         │  (async_hooks)  │  │
│  └──────────────┘         └─────────────────┘  │
│         ▲                         ▲             │
│         │                         │             │
│         └─────────┬───────────────┘             │
│                   │                             │
│          CorrelationStorage                     │
│              Interface                          │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Auto-detection: typeof window check     │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
                       │
                       ▼
              All logs include:
           { conversationId: '...' }
```

## Benefits

1. **✅ Browser Compatibility**: Works in all modern browsers
2. **✅ Zero Configuration**: Automatically adapts to environment
3. **✅ Persistence**: SessionStorage keeps context across reloads
4. **✅ Type Safe**: Full TypeScript support
5. **✅ Backward Compatible**: Existing code works unchanged
6. **✅ Graceful Degradation**: Falls back if features unavailable
7. **✅ Better Debugging**: All logs automatically tagged with conversation context

## Usage Examples

### Frontend (Automatic)

```typescript
// In page.tsx - automatically handled
setCorrelationContext({ conversationId: newConversationId });

// Now all logs include conversationId
logger.info({ action: 'submit_message' }, 'Sending message');
// → Logs: { conversationId: 'conv_123', action: 'submit_message', ... }
```

### Backend (AsyncLocalStorage)

```typescript
// In API route
withCorrelationAsync(
  { conversationId, userId, requestId },
  async () => {
    logger.info('Processing request');
    // All logs in this scope include correlation data
  }
);
```

## Conclusion

The correlation context system now works seamlessly across all environments:
- **Browser**: Uses sessionStorage for persistence
- **Node.js**: Uses AsyncLocalStorage for async tracking  
- **Edge**: Graceful fallback with in-memory storage

All without any build errors or runtime issues! 🎉

