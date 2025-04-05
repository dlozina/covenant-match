export class ApiError extends Error {
  status: number;
  data?: Record<string, unknown>;
  
  constructor(message: string, status: number, data?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
  
  // Helper method to check for specific error conditions
  requiresCaptcha(): boolean {
    return this.data?.requiresCaptcha === true;
  }
  
  // Helper methods for common status codes
  isUnauthorized(): boolean {
    return this.status === 401;
  }
  
  isForbidden(): boolean {
    return this.status === 403;
  }
  
  isNotFound(): boolean {
    return this.status === 404;
  }
  
  isValidationError(): boolean {
    return this.status === 422;
  }
  
  isServerError(): boolean {
    return this.status >= 500;
  }
}

// Specific error types for better error handling
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required', data?: Record<string, unknown>) {
    super(message, 401, data);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends ApiError {
  validationErrors: Record<string, string[]>;
  
  constructor(message: string = 'Validation failed', validationErrors: Record<string, string[]> = {}) {
    super(message, 422, { validationErrors });
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ServerError extends ApiError {
  constructor(message: string = 'Server error occurred') {
    super(message, 500);
    this.name = 'ServerError';
  }
} 