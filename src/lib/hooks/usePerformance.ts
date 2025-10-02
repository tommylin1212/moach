'use client';

import { useCallback, useRef } from 'react';
import { useLogging } from './useLogging';

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  operation: string;
  metadata?: any;
}

export function usePerformance() {
  const logger = useLogging();
  const timers = useRef<Map<string, number>>(new Map());

  const startTimer = useCallback((operation: string) => {
    const startTime = performance.now();
    timers.current.set(operation, startTime);
    logger.debug(`Performance timer started: ${operation}`);
    return startTime;
  }, [logger]);

  const endTimer = useCallback((operation: string, metadata?: any) => {
    const startTime = timers.current.get(operation);
    if (!startTime) {
      logger.warn(`No timer found for operation: ${operation}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    timers.current.delete(operation);
    
    logger.performanceLog(operation, duration, metadata);
    
    return {
      startTime,
      endTime,
      duration,
      operation,
      metadata,
    } as PerformanceMetrics;
  }, [logger]);

  const measureAsync = useCallback(async <T>(
    operation: string,
    asyncFn: () => Promise<T>,
    metadata?: any
  ): Promise<{ result: T; metrics: PerformanceMetrics }> => {
    const startTime = startTimer(operation);
    
    try {
      const result = await asyncFn();
      const metrics = endTimer(operation, { ...metadata, success: true })!;
      return { result, metrics };
    } catch (error) {
      const metrics = endTimer(operation, { ...metadata, success: false, error })!;
      throw error;
    }
  }, [startTimer, endTimer]);

  const measureSync = useCallback(<T>(
    operation: string,
    syncFn: () => T,
    metadata?: any
  ): { result: T; metrics: PerformanceMetrics } => {
    const startTime = startTimer(operation);
    
    try {
      const result = syncFn();
      const metrics = endTimer(operation, { ...metadata, success: true })!;
      return { result, metrics };
    } catch (error) {
      const metrics = endTimer(operation, { ...metadata, success: false, error })!;
      throw error;
    }
  }, [startTimer, endTimer]);

  // Measure component render time
  const measureRender = useCallback((componentName: string, metadata?: any) => {
    const renderStart = performance.now();
    
    return () => {
      const renderEnd = performance.now();
      const duration = renderEnd - renderStart;
      logger.performanceLog(`${componentName} render`, duration, metadata);
    };
  }, [logger]);

  // Measure API call performance
  const measureApiCall = useCallback(async <T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const { result } = await measureAsync(
      `API ${method} ${endpoint}`,
      apiCall,
      { endpoint, method }
    );
    return result;
  }, [measureAsync]);

  return {
    startTimer,
    endTimer,
    measureAsync,
    measureSync,
    measureRender,
    measureApiCall,
  };
}
