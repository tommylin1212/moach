export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableConsole: boolean;
  enableFile: boolean;
  enableDatabase: boolean;
  enableRemote: boolean;
  maxLogSize: number;
  retentionDays: number;
  remoteEndpoint?: string;
  batchSize: number;
  flushInterval: number;
}

export const getLoggingConfig = (): LoggingConfig => {
  const env = process.env.NODE_ENV;
  const isProduction = env === 'production';
  const isDevelopment = env === 'development';

  return {
    level: (process.env.LOG_LEVEL as LoggingConfig['level']) || (isDevelopment ? 'debug' : 'info'),
    enableConsole: !isProduction || process.env.ENABLE_CONSOLE_LOGS === 'true',
    enableFile: isProduction && process.env.ENABLE_FILE_LOGS !== 'false',
    enableDatabase: process.env.ENABLE_DB_LOGS === 'true',
    enableRemote: isProduction && process.env.ENABLE_REMOTE_LOGS === 'true',
    maxLogSize: parseInt(process.env.MAX_LOG_SIZE || '10485760'), // 10MB default
    retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30'),
    remoteEndpoint: process.env.REMOTE_LOG_ENDPOINT,
    batchSize: parseInt(process.env.LOG_BATCH_SIZE || '100'),
    flushInterval: parseInt(process.env.LOG_FLUSH_INTERVAL || '5000'), // 5 seconds
  };
};

export const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

export const shouldLog = (messageLevel: keyof typeof logLevels, configLevel: keyof typeof logLevels): boolean => {
  return logLevels[messageLevel] >= logLevels[configLevel];
};

// Environment-specific log formats
export const getLogFormat = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    timestamp: true,
    colorize: isDevelopment,
    json: !isDevelopment,
    prettyPrint: isDevelopment,
    includeStack: true,
    maxDepth: 3,
  };
};
