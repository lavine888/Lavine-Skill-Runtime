import { NextResponse } from "next/server";
import { executeSkill, RuntimeError } from "@/runtime";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const input = await request.json();
    const idempotencyKey = request.headers.get("idempotency-key") || undefined;
    const run = await executeSkill(id, input, { idempotencyKey });

    const status =
      run.status === "timed_out" ? 504 : run.status === "failed" ? 500 : 200;
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
