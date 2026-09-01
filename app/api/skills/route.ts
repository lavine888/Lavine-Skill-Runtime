import { NextResponse } from "next/server";
import { listSkills } from "@/runtime";

export async function GET() {
  return NextResponse.json({ skills: listSkills() });
}
