import { NextResponse } from "next/server";
import { listSkills, supportedRuntimeTypes } from "@/runtime";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      runtime: "lavine-skill-runtime",
      skills: listSkills().length,
      runners: supportedRuntimeTypes(),
      run_store: "memory",
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
