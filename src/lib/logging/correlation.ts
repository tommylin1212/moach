import { nanoid } from 'nanoid';
import type { CorrelationContext } from './types';

/**
 * Simple storage interface for correlation context
 */
interface CorrelationStorage {
  getStore(): CorrelationContext | undefined;
  run<T>(context: CorrelationContext, fn: () => T): T;
}

/**
 * Browser-compatible correlation storage using sessionStorage for persistence
 * Falls back to in-memory storage if sessionStorage is not available
 */
class BrowserCorrelationStorage implements CorrelationStorage {
  private store: CorrelationContext | undefined;
  private readonly storageKey = 'moach_correlation_context';

  private loadFromSessionStorage(): CorrelationContext | undefined {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return undefined;
    }

    try {
      const stored = sessionStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore errors reading from sessionStorage
    }
    return undefined;
  }

  private saveToSessionStorage(context: CorrelationContext | undefined): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      if (context) {
        sessionStorage.setItem(this.storageKey, JSON.stringify(context));
      } else {
        sessionStorage.removeItem(this.storageKey);
      }
    } catch {
      // Ignore errors writing to sessionStorage
    }
  }

  getStore(): CorrelationContext | undefined {
    // Try in-memory first, then sessionStorage
    if (this.store) {
      return this.store;
    }
    return this.loadFromSessionStorage();
  }

  run<T>(context: CorrelationContext, fn: () => T): T {
    const previousStore = this.store;
    this.store = context;
    this.saveToSessionStorage(context);
    
    try {
      return fn();
    } finally {
      this.store = previousStore;
      this.saveToSessionStorage(previousStore);
    }
  }
}

/**
 * Node.js correlation storage using AsyncLocalStorage
 */
class NodeCorrelationStorage implements CorrelationStorage {
  private asyncLocalStorage: any;

  constructor() {
    // Dynamic import for Node.js only
    if (typeof window === 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { AsyncLocalStorage } = require('async_hooks');
        this.asyncLocalStorage = new AsyncLocalStorage();
      } catch {
        // Fallback if async_hooks is not available
        this.asyncLocalStorage = null;
      }
    }
  }

  getStore(): CorrelationContext | undefined {
    return this.asyncLocalStorage?.getStore();
  }

  run<T>(context: CorrelationContext, fn: () => T): T {
    if (this.asyncLocalStorage) {
      return this.asyncLocalStorage.run(context, fn);
    }
    return fn();
  }
}

/**
 * Detect environment and create appropriate storage
 */
function createCorrelationStorage(): CorrelationStorage {
  if (typeof window === 'undefined') {
    // Node.js environment
    return new NodeCorrelationStorage();
  } else {
    // Browser environment
    return new BrowserCorrelationStorage();
  }
}

/**
 * Correlation storage instance (automatically adapts to environment)
 */
const correlationStorage = createCorrelationStorage();

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return nanoid(12);
}

/**
 * Get the current correlation context
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

/**
 * Get the current request ID
 */
export function getRequestId(): string | undefined {
  return correlationStorage.getStore()?.requestId;
}

/**
 * Get the current user ID
 */
export function getUserId(): string | undefined {
  return correlationStorage.getStore()?.userId;
}

/**
 * Get the current conversation ID
 */
export function getConversationId(): string | undefined {
  return correlationStorage.getStore()?.conversationId;
}

/**
 * Run a function with correlation context
 */
export function withCorrelation<T>(
  context: CorrelationContext,
  fn: () => T
): T {
  return correlationStorage.run(context, fn);
}

/**
 * Run an async function with correlation context
 */
export async function withCorrelationAsync<T>(
  context: CorrelationContext,
  fn: () => Promise<T>
): Promise<T> {
  return correlationStorage.run(context, fn);
}

/**
 * Create correlation context from request headers or generate new
 */
export function createCorrelationContext(options: {
  requestId?: string;
  userId?: string;
  conversationId?: string;
  parentRequestId?: string;
}): CorrelationContext {
  return {
    requestId: options.requestId || generateCorrelationId(),
    userId: options.userId,
    conversationId: options.conversationId,
    parentRequestId: options.parentRequestId,
  };
}

/**
 * Update the current correlation context with additional data
 */
export function updateCorrelationContext(
  updates: Partial<CorrelationContext>
): void {
  const current = getCorrelationContext();
  if (current) {
    Object.assign(current, updates);
  }
}

/**
 * Extract correlation data for logging
 */
export function getCorrelationData(): Record<string, string | undefined> {
  const context = getCorrelationContext();
  if (!context) {
    return {};
  }

  return {
    requestId: context.requestId,
    userId: context.userId,
    conversationId: context.conversationId,
    parentRequestId: context.parentRequestId,
  };
}

/**
 * Middleware helper to extract correlation from headers
 */
export function extractCorrelationFromHeaders(headers: Headers | Record<string, string | string[] | undefined>): Partial<CorrelationContext> {
  const getHeader = (name: string): string | undefined => {
    if (headers instanceof Headers) {
      return headers.get(name) || undefined;
    }
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value || undefined;
  };

  return {
    requestId: getHeader('x-request-id'),
    userId: getHeader('x-user-id'),
    conversationId: getHeader('x-conversation-id'),
    parentRequestId: getHeader('x-parent-request-id'),
  };
}

/**
 * Create headers for outgoing requests with correlation data
 */
export function createCorrelationHeaders(): Record<string, string> {
  const context = getCorrelationContext();
  const headers: Record<string, string> = {};

  if (context?.requestId) {
    headers['x-request-id'] = context.requestId;
  }
  if (context?.userId) {
    headers['x-user-id'] = context.userId;
  }
  if (context?.conversationId) {
    headers['x-conversation-id'] = context.conversationId;
  }

  return headers;
}

/**
 * Set correlation context in the browser (persists to sessionStorage)
 * Useful for tracking conversation IDs, user IDs across the frontend
 */
export function setCorrelationContext(context: Partial<CorrelationContext>): void {
  const current = getCorrelationContext();
  const newContext = createCorrelationContext({
    ...current,
    ...context,
  });
  
  // Use a no-op function to just set the context
  withCorrelation(newContext, () => {});
}
