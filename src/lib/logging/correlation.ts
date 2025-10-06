import { AsyncLocalStorage } from 'async_hooks';
import { nanoid } from 'nanoid';
import type { CorrelationContext } from './types';

/**
 * AsyncLocalStorage instance for request correlation tracking
 */
const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

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
