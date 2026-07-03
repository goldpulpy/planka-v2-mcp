export class PlankaError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response: unknown,
  ) {
    super(message);
    this.name = "PlankaError";
  }
}

export class PlankaValidationError extends PlankaError {
  constructor(message: string, status: number, response: unknown) {
    super(message, status, response);
    this.name = "PlankaValidationError";
  }
}

export class PlankaResourceNotFoundError extends PlankaError {
  constructor(resource: string) {
    super(`Resource not found: ${resource}`, 404, {
      message: `${resource} not found`,
    });
    this.name = "PlankaResourceNotFoundError";
  }
}

export class PlankaAuthenticationError extends PlankaError {
  constructor(message = "Authentication failed") {
    super(message, 401, { message });
    this.name = "PlankaAuthenticationError";
  }
}

export class PlankaPermissionError extends PlankaError {
  constructor(message = "Insufficient permissions") {
    super(message, 403, { message });
    this.name = "PlankaPermissionError";
  }
}

export class PlankaRateLimitError extends PlankaError {
  constructor(
    message = "Rate limit exceeded",
    public readonly resetAt: Date,
  ) {
    super(message, 429, { message, reset_at: resetAt.toISOString() });
    this.name = "PlankaRateLimitError";
  }
}

export class PlankaConflictError extends PlankaError {
  constructor(message: string) {
    super(message, 409, { message });
    this.name = "PlankaConflictError";
  }
}

export function isPlankaError(error: unknown): error is PlankaError {
  return error instanceof PlankaError;
}

export function createPlankaError(status: number, response: any): PlankaError {
  switch (status) {
    case 401:
      return new PlankaAuthenticationError(response?.message);
    case 403:
      return new PlankaPermissionError(response?.message);
    case 404:
      return new PlankaResourceNotFoundError(response?.message || "Resource");
    case 409:
      return new PlankaConflictError(response?.message || "Conflict occurred");
    case 422:
      return new PlankaValidationError(response?.message || "Validation failed", status, response);
    case 429:
      return new PlankaRateLimitError(
        response?.message,
        new Date(response?.reset_at || Date.now() + 60000),
      );
    default:
      return new PlankaError(response?.message || "Planka API error", status, response);
  }
}
