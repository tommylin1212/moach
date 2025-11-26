# Logging Implementation - Frontend Components

This document describes the comprehensive logging implementation for the Moach frontend components using the Pino-based logging system.

## Overview

The logging system has been integrated into all major frontend components to provide:
- **User interaction tracking**: All button clicks, form submissions, and UI interactions
- **Component lifecycle logging**: Mount/unmount and render events
- **Error handling**: Comprehensive error logging with context
- **Performance monitoring**: State changes and data flow tracking
- **Debugging support**: Detailed debug logs for development

## Implemented Components

### 1. Main Page (`src/app/page.tsx`)

**Logged Events:**

#### Component Lifecycle
- **Mount**: Logs when the page component mounts with component context
- **Unmount**: Debug log when component unmounts
- **Conversation Initialization**: 
  - Loading existing conversation from URL (with conversation ID)
  - Creating new conversation (with generated conversation ID)

#### User Interactions
- **Message Submission**:
  - Logs input validation (empty input rejection)
  - Logs message send with full context (model, web search, memory settings, input length)
  - Success confirmation after message sent
  - Error logging if submission fails

- **Web Search Toggle**: Debug log when web search is enabled/disabled
- **Memory Toggle**: Debug log when memory feature is enabled/disabled
- **Model Selection**: Info log when model changes (includes previous and new model)

**Example Logs:**
```typescript
// Component mount
logger.info({ component: 'Page' }, 'Component mounted');

// Message submission
logger.info(
  { 
    component: 'Page',
    action: 'submit_message',
    conversationId: currentConversationId,
    model,
    webSearch,
    memory,
    inputLength: trimmedInput.length
  }, 
  'Submitting user message'
);

// Model change
logger.info(
  { 
    component: 'Page',
    action: 'change_model',
    previousModel: model,
    newModel: value
  }, 
  `Model changed from ${model} to ${value}`
);
```

### 2. Conversation Sidebar (`src/components/conversation-elements/conversation-sidebar.tsx`)

**Logged Events:**

#### Component Lifecycle
- **Render Updates**: Debug log on every render with conversation count, current conversation ID, and loading state

#### User Interactions
- **New Conversation**: Info log when new conversation button is clicked
- **Load Conversation**: Info log when conversation is selected (includes conversation ID and title)
- **Delete Conversation**: Warning log when conversation is deleted (includes conversation ID and title)
- **Edit Title**:
  - Debug log when starting to edit a conversation title
  - Info log when saving a new title (includes conversation ID and new title)
  - Success log after title is updated
  - Error log if title update fails
  - Debug log when edit is cancelled

**Example Logs:**
```typescript
// Render update
logger.debug(
  { 
    component: 'ConversationSidebar',
    conversationCount: conversations.length,
    currentConversationId,
    isLoading
  }, 
  'ConversationSidebar rendered'
);

// Delete conversation
logger.warn(
  { 
    component: 'ConversationSidebar',
    action: 'delete_conversation',
    conversationId: conversation.id,
    conversationTitle: conversation.title
  }, 
  'Deleting conversation'
);
```

### 3. Memory Display (`src/components/conversation-elements/memory.tsx`)

**Logged Events:**

#### Data Processing
- **Memory Extraction**: Debug log when memory items are successfully extracted from a message (includes count and operation types)
- **Parsing Errors**: Error log when memory data parsing fails (with error details)
- **Extraction Errors**: Error log when memory extraction from message fails

#### Component Lifecycle
- **Render with Memories**: Debug log when component renders with memory items (includes memory count and open state)

#### User Interactions
- **Toggle Memory Display**: Debug log when memory panel is opened/closed (includes message ID, new state, and memory count)

**Example Logs:**
```typescript
// Memory extraction success
logger.debug(
  { 
    component: 'MemoryDisplay',
    messageId: message.id,
    memoryCount: memoryItems.length,
    operations: memoryItems.map(m => m.operation)
  }, 
  `Extracted ${memoryItems.length} memory items from message`
);

// Toggle display
logger.debug(
  { 
    component: 'MemoryDisplay',
    action: 'toggle_memory_display',
    messageId: message.id,
    newState: !isOpen,
    memoryCount: memories.length
  }, 
  `Memory display ${!isOpen ? 'opened' : 'closed'}`
);
```

### 4. Message Display (`src/components/conversation-elements/messages.tsx`)

**Logged Events:**

#### Component Lifecycle
- **Render**: Debug log when message component renders (includes message ID, role, and parts count)

**Example Logs:**
```typescript
logger.debug(
  { 
    component: 'MessageDisplay',
    messageId: message.id,
    messageRole: message.role,
    partsCount: message.parts?.length || 0
  }, 
  'MessageDisplay rendered'
);
```

### 5. Source Display (`src/components/conversation-elements/source.tsx`)

**Logged Events:**

#### Component Lifecycle
- **Render with Sources**: Debug log when component renders with sources (includes source count and URLs)

**Example Logs:**
```typescript
logger.debug(
  { 
    component: 'SourceDisplay',
    messageId: message.id,
    sourceCount: uniqueSourceUrls.length,
    urls: uniqueSourceUrls.map(s => s.url)
  }, 
  `SourceDisplay rendered with ${uniqueSourceUrls.length} sources`
);
```

## Log Levels Used

- **`logger.debug()`**: Used for detailed debugging information (component renders, state toggles)
- **`logger.info()`**: Used for important user actions (message submission, conversation operations, model changes)
- **`logger.warn()`**: Used for potentially destructive actions (conversation deletion)
- **`logger.error()`**: Used for error conditions (failed operations, parsing errors)

## Context Information

All logs include structured context data that can be used for filtering and analysis:

### Common Context Fields
- `component`: Name of the component generating the log
- `action`: Specific action being performed
- `conversationId`: Current conversation identifier
- `messageId`: Message identifier (where applicable)

### Specific Context Fields
- **Page Component**: `model`, `webSearch`, `memory`, `inputLength`
- **Sidebar**: `conversationCount`, `conversationTitle`, `isLoading`
- **Memory**: `memoryCount`, `operations`, `isOpen`
- **Messages**: `messageRole`, `partsCount`
- **Sources**: `sourceCount`, `urls`

## Log Transmission

Frontend logs are automatically:
1. Batched for efficiency (default: 10 logs per batch)
2. Transmitted to `/api/logs` endpoint every 5 seconds
3. Sent with `keepalive: true` to ensure delivery even during page transitions
4. Fallback to console if transmission fails

## Development vs Production

The logging system is configured to:
- Use appropriate log levels based on environment (more verbose in development)
- Pretty-print logs in development for readability
- Send structured JSON logs in production for parsing

## Monitoring and Analysis

Logs can be used to:
1. **Track User Behavior**: Follow conversation flows, feature usage patterns
2. **Debug Issues**: Identify where errors occur with full context
3. **Performance Analysis**: Monitor rendering frequency and data flow
4. **Security Auditing**: Track deletions and modifications (warn level logs)

## Best Practices Applied

1. ✅ **Structured Logging**: All logs include context objects for filtering
2. ✅ **Consistent Naming**: Component names and actions follow consistent patterns
3. ✅ **Error Handling**: All error logs include Error objects for stack traces
4. ✅ **Privacy**: Sensitive data (full message content) is not logged, only metadata
5. ✅ **Performance**: Debug logs for render events to track re-render patterns
6. ✅ **User Actions**: All interactive elements log user actions for behavior tracking

## Viewing Logs

### In Development
Logs appear in the browser console and are transmitted to the backend.

### In Production
Access logs through:
- Backend log aggregation system (via `/api/logs`)
- External monitoring tools (when configured)
- Browser console (for immediate debugging)

## Correlation Context

The logging system now includes **correlation context** tracking that automatically includes `conversationId` in all logs. This is implemented using:

- **Browser**: SessionStorage-backed correlation context that persists across page reloads
- **Node.js**: AsyncLocalStorage for request correlation tracking
- **Automatic**: Environment detection and appropriate implementation selection

### Setting Correlation Context

```typescript
import { setCorrelationContext } from '@/lib/logger';

// Set conversation ID for all subsequent logs
setCorrelationContext({ conversationId: 'conv_123' });
```

The `page.tsx` component automatically sets the correlation context whenever:
1. A new conversation is created
2. An existing conversation is loaded
3. The current conversation changes

This ensures all logs throughout the application include the conversation context for easier debugging and tracking.

## Browser Compatibility Fix

The correlation module has been updated to be **browser-compatible**:

- ✅ No longer requires Node.js-specific `async_hooks` module
- ✅ Uses sessionStorage for persistence in the browser
- ✅ Falls back gracefully if sessionStorage is unavailable
- ✅ Automatically detects environment and uses appropriate implementation
- ✅ Zero configuration required

## Future Enhancements

Potential improvements:
1. ✅ ~~Add correlation IDs to track user sessions across components~~ (Implemented!)
2. Implement performance timing for component render durations
3. Add user ID context when authentication is implemented
4. Create dashboard for log visualization
5. Set up alerts for error patterns
6. Add request ID tracking for API calls

