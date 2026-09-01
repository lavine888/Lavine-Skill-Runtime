import Ajv2020 from "ajv/dist/2020";
import OpenAI from "openai";

import { skillDefinitions } from "../skills/registry";
import type { RunRecord, SkillDefinition } from "./types";

export type {
  RunRecord,
  RunStatus,
  SkillAdapter,
  SkillDefinition,
  SkillManifest,
} from "./types";

const registry = new Map<string, SkillDefinition>(
  skillDefinitions.map((definition) => [definition.manifest.id, definition]),
);

declare global {
  // eslint-disable-next-line no-var
  var __lavineSkillRuns: Map<string, RunRecord> | undefined;
}

const runs = globalThis.__lavineSkillRuns ?? new Map<string, RunRecord>();
globalThis.__lavineSkillRuns = runs;

const ajv = new Ajv2020({ allErrors: true, strict: false });

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

async function runOpenAI(skill: SkillDefinition, input: Record<string, unknown>) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const messages = skill.adapter.buildMessages(input);

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    messages: [
      { role: "system", content: messages.system },
      { role: "user", content: messages.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: skill.adapter.responseSchemaName,
        strict: true,
        schema: skill.outputSchema,
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
  const typedInput = input as Record<string, unknown>;

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
    const output = process.env.OPENAI_API_KEY
      ? await runOpenAI(skill, typedInput)
      : skill.adapter.demo(typedInput);

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
