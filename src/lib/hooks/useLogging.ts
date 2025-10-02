'use client';

import { useLogger } from 'nexlog/react';
import { useCallback } from 'react';

export interface ClientLogger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, error?: Error | any, ...args: any[]) => void;
  
  // Specialized logging functions
  userAction: (action: string, component: string, metadata?: any) => void;
  componentMount: (componentName: string, props?: any) => void;
  componentError: (componentName: string, error: Error, errorInfo?: any) => void;
  apiCall: (endpoint: string, method: string, status?: number) => void;
  performanceLog: (operation: string, duration: number, metadata?: any) => void;
}

export function useLogging(): ClientLogger {
  const {logger} = useLogger();

  const debug = useCallback((message: string, ...args: any[]) => {
    logger.debug(`[Client] ${message}`, ...args);
  }, [logger]);

  const info = useCallback((message: string, ...args: any[]) => {
    logger.info(`[Client] ${message}`, ...args);
  }, [logger]);

  const warn = useCallback((message: string, ...args: any[]) => {
    logger.warn(`[Client] ${message}`, ...args);
  }, [logger]);

  const error = useCallback((message: string, error?: Error | any, ...args: any[]) => {
    if (error instanceof Error) {
      logger.error(`[Client] ${message}`, { error: error.message, stack: error.stack });
    } else {
      logger.error(`[Client] ${message}`, error);
    }
  }, [logger]);

  const userAction = useCallback((action: string, component: string, metadata?: any) => {
    logger.info(`[User Action] ${action} in ${component}`, metadata);
  }, [logger]);

  const componentMount = useCallback((componentName: string, props?: any) => {
    logger.debug(`[Component Mount] ${componentName}`, props);
  }, [logger]);

  const componentError = useCallback((componentName: string, error: Error, errorInfo?: any) => {
    logger.error(`[Component Error] ${componentName}`, { 
      error: error.message, 
      stack: error.stack,
      errorInfo 
    });
  }, [logger]);

  const apiCall = useCallback((endpoint: string, method: string, status?: number) => {
    if (status && status >= 400) {
      logger.error(`[API Call] ${method} ${endpoint} failed`, { status });
    } else {
      logger.info(`[API Call] ${method} ${endpoint}`, { status });
    }
  }, [logger]);

  const performanceLog = useCallback((operation: string, duration: number, metadata?: any) => {
    if (duration > 1000) {
      logger.warn(`[Performance] Slow operation: ${operation}`, { duration, ...metadata });
    } else {
      logger.debug(`[Performance] ${operation}`, { duration, ...metadata });
    }
  }, [logger]);

  return {
    debug,
    info,
    warn,
    error,
    userAction,
    componentMount,
    componentError,
    apiCall,
    performanceLog,
  };
}
