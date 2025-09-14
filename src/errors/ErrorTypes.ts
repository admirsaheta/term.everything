/**
 * Comprehensive error type definitions for term.everything
 * Provides structured error handling with proper categorization
 */

export enum ErrorCategory {
  SYSTEM = 'SYSTEM',
  NETWORK = 'NETWORK',
  WAYLAND = 'WAYLAND',
  DISPLAY = 'DISPLAY',
  TERMINAL = 'TERMINAL',
  INTEROP = 'INTEROP',
  VALIDATION = 'VALIDATION',
  CONFIGURATION = 'CONFIGURATION'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  component?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
  stackTrace?: string;
  userAgent?: string;
  sessionId?: string;
}

/**
 * Base error class with enhanced context and categorization
 */
export class TermEverythingError extends Error {
  public readonly context: ErrorContext;
  public readonly originalError?: Error;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TermEverythingError';
    
    this.context = {
      timestamp: new Date(),
      category,
      severity,
      metadata,
      stackTrace: this.stack,
      sessionId: this.generateSessionId()
    };
    
    this.originalError = originalError;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TermEverythingError);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert error to a structured object for logging
   */
  toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

/**
 * System-level errors (file system, process, etc.)
 */
export class SystemError extends TermEverythingError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.SYSTEM, severity, originalError, metadata);
    this.name = 'SystemError';
  }
}

/**
 * Network and socket-related errors
 */
export class NetworkError extends TermEverythingError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.NETWORK, severity, originalError, metadata);
    this.name = 'NetworkError';
  }
}

/**
 * Wayland protocol and client errors
 */
export class WaylandError extends TermEverythingError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.WAYLAND, severity, originalError, metadata);
    this.name = 'WaylandError';
  }
}

/**
 * Display server and rendering errors
 */
export class DisplayError extends TermEverythingError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.DISPLAY, severity, originalError, metadata);
    this.name = 'DisplayError';
  }
}

/**
 * Terminal and TTY-related errors
 */
export class TerminalError extends TermEverythingError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.TERMINAL, severity, originalError, metadata);
    this.name = 'TerminalError';
  }
}

/**
 * C++ interop and native code errors
 */
export class InteropError extends TermEverythingError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.CRITICAL,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.INTEROP, severity, originalError, metadata);
    this.name = 'InteropError';
  }
}

/**
 * Validation and input errors
 */
export class ValidationError extends TermEverythingError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.LOW,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.VALIDATION, severity, originalError, metadata);
    this.name = 'ValidationError';
  }
}

/**
 * Configuration and setup errors
 */
export class ConfigurationError extends TermEverythingError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.CONFIGURATION, severity, originalError, metadata);
    this.name = 'ConfigurationError';
  }
}

/**
 * Type guard to check if an error is a TermEverythingError
 */
export function isTermEverythingError(error: unknown): error is TermEverythingError {
  return error instanceof TermEverythingError;
}

/**
 * Type guard to check if an error is a specific category
 */
export function isErrorCategory(error: unknown, category: ErrorCategory): boolean {
  return isTermEverythingError(error) && error.context.category === category;
}

/**
 * Type guard to check if an error meets a minimum severity level
 */
export function isErrorSeverity(error: unknown, minSeverity: ErrorSeverity): boolean {
  if (!isTermEverythingError(error)) return false;
  
  const severityLevels = {
    [ErrorSeverity.LOW]: 1,
    [ErrorSeverity.MEDIUM]: 2,
    [ErrorSeverity.HIGH]: 3,
    [ErrorSeverity.CRITICAL]: 4
  };
  
  return severityLevels[error.context.severity] >= severityLevels[minSeverity];
}