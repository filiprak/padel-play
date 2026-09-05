/**
 * functions/lib/errors.ts — typed service errors.
 * Services throw these; `RestEndpoint.handle` maps them to HTTP responses
 * so route adapters don't need try/catch per call.
 */
export class ServiceError extends Error {
  status: number
  details?: unknown
  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ServiceError'
    this.status = status
    this.details = details
  }

  static badRequest(message: string, details?: unknown): ServiceError {
    return new ServiceError(400, message, details)
  }

  static notFound(message: string, details?: unknown): ServiceError {
    return new ServiceError(404, message, details)
  }

  static conflict(message: string, details?: unknown): ServiceError {
    return new ServiceError(409, message, details)
  }
}
