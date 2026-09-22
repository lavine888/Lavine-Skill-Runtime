import { NextResponse } from "next/server";
import { executeSkill, getSkill, RuntimeError } from "@/runtime";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const skill = getSkill(id);
  if (!skill) {
    return NextResponse.json(
      {
        error: {
          code: "UNKNOWN_SKILL",
          message: `Unknown skill: ${id}`,
          retryable: false,
        },
      },
      { status: 404 },
    );
  }

  // Reject oversized bodies before parsing. The route handler has no default
  // body limit, and manifest limits are only enforced after a full parse.
  const maxInputBytes = skill.manifest.limits.max_input_bytes;
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN;
  if (Number.isInteger(contentLength) && contentLength > maxInputBytes) {
    return NextResponse.json(
      {
        error: {
          code: "INPUT_TOO_LARGE",
          message: `Request body is ${contentLength} bytes; limit is ${maxInputBytes} bytes.`,
          retryable: false,
        },
      },
      { status: 413 },
    );
  }

  try {
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "INPUT_INVALID",
            message: "Request body must be valid JSON.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    const idempotencyKey = request.headers.get("idempotency-key") || undefined;
    const run = await executeSkill(id, input, { idempotencyKey });

    // Pre-run contract errors are thrown as RuntimeError; once a Run exists,
    // its persisted error classification decides the HTTP status (502/503/504
    // for provider failures, 500 for execution failures, 504 on timeout).
    const status =
      run.status === "timed_out"
        ? 504
        : run.status === "failed"
          ? (run.error_http_status ?? 500)
          : 200;
    return NextResponse.json(run, { status });
  } catch (error) {
    if (error instanceof RuntimeError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            retryable: error.retryable,
          },
        },
        { status: error.httpStatus },
      );
    }

    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message,
          retryable: false,
        },
      },
      { status: 500 },
    );
  }
}
