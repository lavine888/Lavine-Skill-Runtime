import { NextResponse } from "next/server";
import { executeSkill } from "@/runtime";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const input = await request.json();
    const run = await executeSkill(id, input);
    const status = run.status === "failed" ? 500 : 200;
    return NextResponse.json(run, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    const status = message.startsWith("Unknown skill") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
