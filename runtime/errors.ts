export type RuntimeErrorCode =
  | "UNKNOWN_SKILL"
  | "INPUT_INVALID"
  | "INPUT_TOO_LARGE"
  | "OUTPUT_INVALID"
  | "OUTPUT_TOO_LARGE"
  | "IDEMPOTENCY_CONFLICT"
  | "CONCURRENCY_LIMIT"
  | "RUNNER_UNAVAILABLE"
  | "PROVIDER_AUTH_FAILED"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_FAILED"
  | "EXECUTION_TIMEOUT"
  | "EXECUTION_FAILED"
  | "INTERNAL_ERROR";

export class RuntimeError extends Error {
  readonly code: RuntimeErrorCode;
  readonly retryable: boolean;
  readonly httpStatus: number;

  constructor(
    code: RuntimeErrorCode,
    message: string,
    options: { retryable?: boolean; httpStatus?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "RuntimeError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.httpStatus = options.httpStatus ?? 500;
  }
}

export function asRuntimeError(error: unknown): RuntimeError {
  if (error instanceof RuntimeError) return error;

  const message = error instanceof Error ? error.message : "Unknown runtime error";
  return new RuntimeError("EXECUTION_FAILED", message, {
    retryable: false,
    httpStatus: 500,
    cause: error,
  });
}
