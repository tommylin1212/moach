// Server-side logging utility 
// For client-side logging, use the useLogging hook which uses nexlog

const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

const shouldLog = (level: keyof typeof logLevels) => {
  return logLevels[level] >= logLevels[logLevel as keyof typeof logLevels];
};

const formatLog = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = '[Moach]';
  
  if (isDevelopment) {
    // Pretty format for development
    return `${timestamp} ${prefix} [${level.toUpperCase()}] ${message}${data ? ` ${JSON.stringify(data, null, 2)}` : ''}`;
  } else {
    // JSON format for production
    return JSON.stringify({
      timestamp,
      service: 'moach',
      level: level.toUpperCase(),
      message,
      ...data,
    });
  }
};

// Convenience functions for different log levels
export const log = {
  debug: (message: string, data?: any) => {
    if (shouldLog('debug')) {
      console.log(formatLog('debug', message, data));
    }
  },
  info: (message: string, data?: any) => {
    if (shouldLog('info')) {
      console.log(formatLog('info', message, data));
    }
  },
  warn: (message: string, data?: any) => {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, data));
    }
  },
  error: (message: string, error?: Error | any, data?: any) => {
    if (shouldLog('error')) {
      const errorData = error instanceof Error ? {
        error: error.message,
        stack: error.stack,
        ...data
      } : { error, ...data };
      console.error(formatLog('error', message, errorData));
    }
  },
};

// Database operation logging
export const dbLog = {
  query: (operation: string, table: string, duration?: number) => 
    log.debug(`DB Query: ${operation} on ${table}`, { operation, table, duration }),
  error: (operation: string, table: string, error: Error) =>
    log.error(`DB Error: ${operation} on ${table}`, error, { operation, table }),
  success: (operation: string, table: string, recordCount?: number) =>
    log.info(`DB Success: ${operation} on ${table}`, { operation, table, recordCount }),
};

// API operation logging
export const apiLog = {
  request: (method: string, path: string, userId?: string) =>
    log.info(`API Request: ${method} ${path}`, { method, path, userId }),
  response: (method: string, path: string, status: number, duration?: number) =>
    log.info(`API Response: ${method} ${path}`, { method, path, status, duration }),
  error: (method: string, path: string, error: Error, userId?: string) =>
    log.error(`API Error: ${method} ${path}`, error, { method, path, userId }),
};

// AI/Memory operation logging
export const aiLog = {
  memoryStore: (key: string, userId: string) =>
    log.info('Memory stored', { key, userId }),
  memoryRetrieve: (query: string, resultCount: number, userId: string) =>
    log.info('Memory retrieved', { query, resultCount, userId }),
  chatRequest: (messageCount: number, model: string, userId?: string) =>
    log.info('Chat request', { messageCount, model, userId }),
  chatResponse: (responseLength: number, duration?: number, userId?: string) =>
    log.info('Chat response', { responseLength, duration, userId }),
  error: (operation: string, error: Error, userId?: string) =>
    log.error(`AI Error: ${operation}`, error, { operation, userId }),
};