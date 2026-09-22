import { NextResponse } from "next/server";
import {
  hasConfiguredLlmProvider,
  isDemoExecutionAllowed,
  listSkills,
  supportedRuntimeTypes,
} from "@/runtime";

export async function GET() {
  const llmProvider = hasConfiguredLlmProvider()
    ? "configured"
    : isDemoExecutionAllowed()
      ? "demo"
      : "unconfigured";

  return NextResponse.json(
    {
      status: "ok",
      runtime: "lavine-skill-runtime",
      skills: listSkills().length,
      runners: supportedRuntimeTypes(),
      run_store: "memory",
      llm_provider: llmProvider,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
