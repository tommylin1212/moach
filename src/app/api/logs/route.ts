import { NextRequest, NextResponse } from 'next/server';
import { createBackendLogger } from '@/lib/logging/backend-logger';
import type { LogEntry } from '@/lib/logging/types';

// Create a dedicated logger for handling frontend logs
const frontendLogHandler = createBackendLogger({
  level: 'trace', // Accept all log levels from frontend
  environment: 'nodejs',
  serviceName: 'moach-frontend-logs',
  prettyPrint: process.env.NODE_ENV === 'development',
});

/**
 * Handle incoming logs from frontend clients
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle single log entry
    if (body.level && body.message) {
      const logEntry: LogEntry = body;
      logFrontendEntry(logEntry);
      return NextResponse.json({ success: true });
    }
    
    // Handle batch of log entries
    if (body.logs && Array.isArray(body.logs)) {
      const logEntries: LogEntry[] = body.logs;
      logEntries.forEach(logFrontendEntry);
      return NextResponse.json({ 
        success: true, 
        processed: logEntries.length 
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid log format' },
      { status: 400 }
    );
    
  } catch (error) {
    frontendLogHandler.error(error instanceof Error ? error : new Error('Unknown error'), 
      'Failed to process frontend logs');
    
    return NextResponse.json(
      { error: 'Failed to process logs' },
      { status: 500 }
    );
  }
}

/**
 * Process a single frontend log entry
 */
function logFrontendEntry(entry: LogEntry): void {
  const logData = {
    ...entry.context,
    source: entry.source,
    service: entry.service,
    originalTimestamp: entry.timestamp,
  };

  // Map frontend log levels to backend logger methods
  switch (entry.level) {
    case 'trace':
      frontendLogHandler.trace(logData, `[FRONTEND] ${entry.message}`);
      break;
    case 'debug':
      frontendLogHandler.debug(logData, `[FRONTEND] ${entry.message}`);
      break;
    case 'info':
      frontendLogHandler.info(logData, `[FRONTEND] ${entry.message}`);
      break;
    case 'warn':
      frontendLogHandler.warn(logData, `[FRONTEND] ${entry.message}`);
      break;
    case 'error':
      frontendLogHandler.error(logData, `[FRONTEND] ${entry.message}`);
      break;
    case 'fatal':
      frontendLogHandler.fatal(logData, `[FRONTEND] ${entry.message}`);
      break;
    default:
      frontendLogHandler.info(logData, `[FRONTEND] ${entry.message}`);
  }
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
