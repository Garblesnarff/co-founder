/**
 * Custom Error Hierarchy for Co-founder MCP
 *
 * Provides structured errors with codes, messages, and optional details.
 * These errors can be caught and transformed into consistent MCP tool responses.
 */

/**
 * Base error class for all tool-related errors.
 * Extends Error with a code and optional details object.
 */
export class ToolError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ToolError';
    // Maintains proper stack trace for where our error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts the error to a JSON-serializable object for MCP responses.
   */
  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Thrown when a requested resource (task, issue, learning, etc.) is not found.
 */
export class NotFoundError extends ToolError {
  constructor(resource: string, id: string | number) {
    super('NOT_FOUND', `${resource} not found: ${id}`, { resource, id });
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when authentication fails or credentials are missing/invalid.
 */
export class AuthenticationError extends ToolError {
  constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
    super('AUTHENTICATION_FAILED', message, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Thrown when the user lacks permission to perform an action.
 */
export class AuthorizationError extends ToolError {
  constructor(action: string, resource?: string) {
    const message = resource
      ? `Not authorized to ${action} ${resource}`
      : `Not authorized to ${action}`;
    super('AUTHORIZATION_FAILED', message, { action, resource });
    this.name = 'AuthorizationError';
  }
}

/**
 * Thrown when input validation fails.
 */
export class ValidationError extends ToolError {
  constructor(message: string, field?: string, constraints?: Record<string, unknown>) {
    super('VALIDATION_FAILED', message, { field, constraints });
    this.name = 'ValidationError';
  }
}

/**
 * Thrown when a required parameter is missing.
 */
export class MissingParameterError extends ValidationError {
  constructor(parameter: string) {
    super(`Missing required parameter: ${parameter}`, parameter);
    this.name = 'MissingParameterError';
  }
}

/**
 * Thrown when a parameter has an invalid type or format.
 */
export class InvalidParameterError extends ValidationError {
  constructor(parameter: string, expected: string, received?: unknown) {
    super(
      `Invalid parameter '${parameter}': expected ${expected}${received !== undefined ? `, got ${typeof received}` : ''}`,
      parameter,
      { expected, received }
    );
    this.name = 'InvalidParameterError';
  }
}

/**
 * Thrown when an operation conflicts with the current state.
 * Examples: completing a task that's already completed, claiming an already-claimed task.
 */
export class ConflictError extends ToolError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT', message, details);
    this.name = 'ConflictError';
  }
}

/**
 * Thrown when a database operation fails.
 */
export class DatabaseError extends ToolError {
  constructor(operation: string, originalError?: Error) {
    super('DATABASE_ERROR', `Database operation failed: ${operation}`, {
      operation,
      originalMessage: originalError?.message,
    });
    this.name = 'DatabaseError';
  }
}

/**
 * Thrown when an external service (Slack, Notion, etc.) fails.
 */
export class ExternalServiceError extends ToolError {
  constructor(service: string, operation: string, originalError?: Error) {
    super('EXTERNAL_SERVICE_ERROR', `${service} ${operation} failed`, {
      service,
      operation,
      originalMessage: originalError?.message,
    });
    this.name = 'ExternalServiceError';
  }
}

/**
 * Thrown when a rate limit is exceeded.
 */
export class RateLimitError extends ToolError {
  constructor(service: string, retryAfterSeconds?: number) {
    super('RATE_LIMIT_EXCEEDED', `Rate limit exceeded for ${service}`, {
      service,
      retryAfterSeconds,
    });
    this.name = 'RateLimitError';
  }
}

/**
 * Thrown when an operation times out.
 */
export class TimeoutError extends ToolError {
  constructor(operation: string, timeoutMs: number) {
    super('TIMEOUT', `Operation timed out: ${operation}`, { operation, timeoutMs });
    this.name = 'TimeoutError';
  }
}

/**
 * Thrown when a precondition for an operation is not met.
 * Example: trying to complete a task that has unresolved blockers.
 */
export class PreconditionError extends ToolError {
  constructor(message: string, precondition: string, details?: Record<string, unknown>) {
    super('PRECONDITION_FAILED', message, { precondition, ...details });
    this.name = 'PreconditionError';
  }
}

/**
 * Type guard to check if an error is a ToolError.
 */
export function isToolError(error: unknown): error is ToolError {
  return error instanceof ToolError;
}

/**
 * Wraps any error into a ToolError for consistent handling.
 * If already a ToolError, returns as-is. Otherwise wraps in a generic ToolError.
 */
export function wrapError(error: unknown, fallbackMessage: string = 'An unexpected error occurred'): ToolError {
  if (isToolError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ToolError('INTERNAL_ERROR', error.message || fallbackMessage, {
      originalName: error.name,
    });
  }

  return new ToolError('INTERNAL_ERROR', fallbackMessage, {
    originalValue: String(error),
  });
}
