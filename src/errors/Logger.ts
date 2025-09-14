/**
 * Comprehensive logging system for term.everything
 * Provides structured logging with different levels and output formats
 */

import { TermEverythingError, ErrorSeverity, ErrorCategory } from './ErrorTypes.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  component?: string;
  metadata?: Record<string, unknown>;
  error?: TermEverythingError | Error;
  sessionId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  enableStructuredOutput: boolean;
  enableColors: boolean;
}

/**
 * ANSI color codes for console output
 */
const Colors = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  GRAY: '\x1b[90m'
} as const;

/**
 * Main logger class with multiple output targets and formatting options
 */
export class Logger {
  private config: LoggerConfig;
  private sessionId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableStructuredOutput: false,
      enableColors: true,
      ...config
    };
    
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log a debug message
   */
  debug(message: string, component?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, component, metadata);
  }

  /**
   * Log an info message
   */
  info(message: string, component?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, component, metadata);
  }

  /**
   * Log a warning message
   */
  warn(message: string, component?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, component, metadata);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: TermEverythingError | Error, component?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, component, metadata, error);
  }

  /**
   * Log a fatal error message
   */
  fatal(message: string, error?: TermEverythingError | Error, component?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, component, metadata, error);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    component?: string,
    metadata?: Record<string, unknown>,
    error?: TermEverythingError | Error
  ): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      component,
      metadata,
      error,
      sessionId: this.sessionId
    };

    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    if (this.config.enableFile && this.config.filePath) {
      this.writeToFile(entry);
    }
  }

  /**
   * Write log entry to console with formatting
   */
  private writeToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelStr = LogLevel[entry.level].padEnd(5);
    const component = entry.component ? `[${entry.component}]` : '';
    
    let output: string;
    
    if (this.config.enableStructuredOutput) {
      output = JSON.stringify({
        timestamp,
        level: levelStr.trim(),
        message: entry.message,
        component: entry.component,
        metadata: entry.metadata,
        error: entry.error ? this.serializeError(entry.error) : undefined
      });
    } else {
      const colorizedLevel = this.config.enableColors ? this.colorizeLevel(levelStr, entry.level) : levelStr;
      const colorizedComponent = this.config.enableColors && component ? `${Colors.CYAN}${component}${Colors.RESET}` : component;
      
      output = `${Colors.GRAY}${timestamp}${Colors.RESET} ${colorizedLevel} ${colorizedComponent} ${entry.message}`;
      
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        output += `\n${Colors.DIM}  Metadata: ${JSON.stringify(entry.metadata, null, 2)}${Colors.RESET}`;
      }
      
      if (entry.error) {
        output += `\n${Colors.DIM}  Error: ${this.formatError(entry.error)}${Colors.RESET}`;
      }
    }

    // Use appropriate console method based on log level
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
    }
  }

  /**
   * Write log entry to file (placeholder for file logging)
   */
  private async writeToFile(entry: LogEntry): Promise<void> {
    // TODO: Implement file logging with rotation
    // This would require file system operations and log rotation logic
    try {
      const logLine = JSON.stringify({
        timestamp: entry.timestamp.toISOString(),
        level: LogLevel[entry.level],
        message: entry.message,
        component: entry.component,
        metadata: entry.metadata,
        error: entry.error ? this.serializeError(entry.error) : undefined,
        sessionId: entry.sessionId
      }) + '\n';
      
      // For now, we'll skip file writing to avoid file system dependencies
      // In a full implementation, this would write to the configured file path
    } catch (fileError) {
      // Fallback to console if file writing fails
      console.error('Failed to write to log file:', fileError);
    }
  }

  /**
   * Colorize log level for console output
   */
  private colorizeLevel(levelStr: string, level: LogLevel): string {
    if (!this.config.enableColors) return levelStr;
    
    switch (level) {
      case LogLevel.DEBUG:
        return `${Colors.GRAY}${levelStr}${Colors.RESET}`;
      case LogLevel.INFO:
        return `${Colors.GREEN}${levelStr}${Colors.RESET}`;
      case LogLevel.WARN:
        return `${Colors.YELLOW}${levelStr}${Colors.RESET}`;
      case LogLevel.ERROR:
        return `${Colors.RED}${levelStr}${Colors.RESET}`;
      case LogLevel.FATAL:
        return `${Colors.BRIGHT}${Colors.RED}${levelStr}${Colors.RESET}`;
      default:
        return levelStr;
    }
  }

  /**
   * Format error for display
   */
  private formatError(error: TermEverythingError | Error): string {
    if (error instanceof TermEverythingError) {
      return `${error.name}: ${error.message} [${error.context.category}:${error.context.severity}]`;
    }
    return `${error.name}: ${error.message}`;
  }

  /**
   * Serialize error for structured output
   */
  private serializeError(error: TermEverythingError | Error): Record<string, unknown> {
    if (error instanceof TermEverythingError) {
      return error.toLogObject();
    }
    
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  /**
   * Update logger configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableFile: false,
  enableStructuredOutput: false,
  enableColors: process.stdout.isTTY
});

/**
 * Convenience function to create a component-specific logger
 */
export function createComponentLogger(componentName: string): {
  debug: (message: string, metadata?: Record<string, unknown>) => void;
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, error?: TermEverythingError | Error, metadata?: Record<string, unknown>) => void;
  fatal: (message: string, error?: TermEverythingError | Error, metadata?: Record<string, unknown>) => void;
} {
  return {
    debug: (message: string, metadata?: Record<string, unknown>) => 
      logger.debug(message, componentName, metadata),
    info: (message: string, metadata?: Record<string, unknown>) => 
      logger.info(message, componentName, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) => 
      logger.warn(message, componentName, metadata),
    error: (message: string, error?: TermEverythingError | Error, metadata?: Record<string, unknown>) => 
      logger.error(message, error, componentName, metadata),
    fatal: (message: string, error?: TermEverythingError | Error, metadata?: Record<string, unknown>) => 
      logger.fatal(message, error, componentName, metadata)
  };
}