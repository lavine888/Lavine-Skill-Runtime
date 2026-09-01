import { NextResponse } from "next/server";
import { getSkill } from "@/runtime";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const skill = getSkill(id);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  return NextResponse.json({
    manifest: skill.manifest,
    input_schema: skill.inputSchema,
    output_schema: skill.outputSchema,
  });
}
