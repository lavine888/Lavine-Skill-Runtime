import { NextResponse } from "next/server";
import { listRuns } from "@/runtime";

export async function GET() {
  return NextResponse.json({ runs: await listRuns() });
}
