import Ajv from "ajv";
import OpenAI from "openai";

import manifest from "@/skills/career-alpha-proof/manifest.json";
import inputSchema from "@/skills/career-alpha-proof/input.schema.json";
import outputSchema from "@/skills/career-alpha-proof/output.schema.json";
import {
  buildCareerProofPrompt,
  CAREER_ALPHA_PROOF_SYSTEM_PROMPT,
} from "@/skills/career-alpha-proof/prompt";

export type RunStatus = "queued" | "running" | "completed" | "failed";

export type SkillManifest = {
  schema_version: string;
  id: string;
  name: string;
  description: string;
  version: string;
  source: { repo: string; path: string };
  runtime: { type: "llm"; adapter: string };
  input_schema: string;
  output_schema: string;
  artifacts: string[];
  limits: { timeout_seconds: number };
};

export type RunRecord = {
  id: string;
  skill_id: string;
  skill_version: string;
  status: RunStatus;
  input: unknown;
  output?: unknown;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  runner: "openai" | "demo";
};

type RegisteredSkill = {
  manifest: SkillManifest;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
};

const registry = new Map<string, RegisteredSkill>([
  [
    manifest.id,
    {
      manifest: manifest as SkillManifest,
      inputSchema: inputSchema as Record<string, unknown>,
      outputSchema: outputSchema as Record<string, unknown>,
    },
  ],
]);

declare global {
  // eslint-disable-next-line no-var
  var __lavineSkillRuns: Map<string, RunRecord> | undefined;
}

const runs = globalThis.__lavineSkillRuns ?? new Map<string, RunRecord>();
globalThis.__lavineSkillRuns = runs;

const ajv = new Ajv({ allErrors: true, strict: false });

export function listSkills() {
  return Array.from(registry.values()).map(({ manifest }) => manifest);
}

export function getSkill(id: string) {
  return registry.get(id);
}

export function getRun(id: string) {
  return runs.get(id);
}

function validate(schema: Record<string, unknown>, value: unknown) {
  const validator = ajv.compile(schema);
  const valid = validator(value);
  if (!valid) {
    const message = validator.errors
      ?.map((error) => `${error.instancePath || "/"} ${error.message}`)
      .join("; ");
    throw new Error(`Schema validation failed: ${message || "invalid value"}`);
  }
}

function demoOutput(input: Record<string, string>) {
  const evidence = input.evidence?.trim();
  return {
    summary:
      "Demo audit completed through the same manifest, schema, run lifecycle, and output validation path used by the live runner. Add OPENAI_API_KEY for model-backed analysis.",
    claims: [
      {
        claim: input.resume.slice(0, 180),
        confidence: evidence ? "SUPPORTED" : "SELF-REPORTED",
        evidence: evidence ? [evidence.slice(0, 240)] : [],
        risk: evidence
          ? "The supplied material supports the existence of the work, but ownership, exact outcomes, and causality still require claim-level evidence."
          : "No external or reproducible evidence was supplied, so the claim currently depends mainly on self-report.",
        safe_wording: `Worked on experience relevant to ${input.target_role}; describe only the responsibilities and outcomes you can directly support.`,
        next_action:
          "Attach the smallest direct artifact that proves ownership or outcome: a PR, benchmark, deployment record, design decision, or external result.",
      },
    ],
    next_actions: [
      "Replace broad claims with atomic claims.",
      "Attach direct evidence to the highest-value claim.",
      "Re-run the audit before moving the claim into resume or interview wording.",
    ],
  };
}

async function runOpenAI(
  input: Record<string, string>,
  schema: Record<string, unknown>,
) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    messages: [
      { role: "system", content: CAREER_ALPHA_PROOF_SYSTEM_PROMPT },
      { role: "user", content: buildCareerProofPrompt(input) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "career_proof_audit",
        strict: true,
        schema,
      },
    },
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Model returned no content.");
  return JSON.parse(text);
}

export async function executeSkill(id: string, input: unknown): Promise<RunRecord> {
  const skill = registry.get(id);
  if (!skill) throw new Error(`Unknown skill: ${id}`);

  validate(skill.inputSchema, input);

  const run: RunRecord = {
    id: crypto.randomUUID(),
    skill_id: skill.manifest.id,
    skill_version: skill.manifest.version,
    status: "queued",
    input,
    created_at: new Date().toISOString(),
    runner: process.env.OPENAI_API_KEY ? "openai" : "demo",
  };
  runs.set(run.id, run);

  run.status = "running";
  run.started_at = new Date().toISOString();

  try {
    const typedInput = input as Record<string, string>;
    const output = process.env.OPENAI_API_KEY
      ? await runOpenAI(typedInput, skill.outputSchema)
      : demoOutput(typedInput);

    validate(skill.outputSchema, output);
    run.output = output;
    run.status = "completed";
    run.completed_at = new Date().toISOString();
    runs.set(run.id, run);
    return run;
  } catch (error) {
    run.status = "failed";
    run.error = error instanceof Error ? error.message : "Unknown runtime error";
    run.completed_at = new Date().toISOString();
    runs.set(run.id, run);
    return run;
  }
}
