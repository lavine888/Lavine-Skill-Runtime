import { NextResponse } from "next/server";
import { getRun } from "@/runtime";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json(
      {
        error: {
          code: "UNKNOWN_RUN",
          message: `Unknown run: ${runId}`,
          retryable: false,
        },
      },
      { status: 404 },
    );
  }
  return NextResponse.json(run);
}
