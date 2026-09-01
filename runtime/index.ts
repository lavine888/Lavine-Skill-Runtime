import { skillDefinitions } from "../skills/registry";
import { buildRegistry } from "./registry";
import { defaultRunStore } from "./run-store";
import { getRunner, listRunnerTypes } from "./runners";
import { validateValue } from "./schema";
import type { RunRecord } from "./types";

export type {
  RunRecord,
  RunStatus,
  RuntimeType,
  SkillAdapter,
  SkillDefinition,
  SkillManifest,
  SkillRunner,
  SourceReference,
} from "./types";

const registry = buildRegistry(skillDefinitions);

class SkillTimeoutError extends Error {
  constructor(timeoutSeconds: number) {
    super(`Skill execution timed out after ${timeoutSeconds}s`);
    this.name = "SkillTimeoutError";
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutSeconds: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new SkillTimeoutError(timeoutSeconds)),
      timeoutSeconds * 1000,
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function listSkills() {
  return Array.from(registry.values()).map(({ manifest }) => manifest);
}

export function getSkill(id: string) {
  return registry.get(id);
}

export function supportedRuntimeTypes() {
  return listRunnerTypes();
}

export async function getRun(id: string) {
  return defaultRunStore.get(id);
}

export async function listRuns() {
  return defaultRunStore.list();
}

export async function executeSkill(id: string, input: unknown): Promise<RunRecord> {
  const skill = registry.get(id);
  if (!skill) throw new Error(`Unknown skill: ${id}`);

  validateValue(skill.inputSchema, input);
  const typedInput = input as Record<string, unknown>;
  const runner = getRunner(skill.manifest.runtime.type);

  const run: RunRecord = {
    id: crypto.randomUUID(),
    skill_id: skill.manifest.id,
    skill_version: skill.manifest.version,
    source: structuredClone(skill.manifest.source),
    status: "queued",
    input,
    created_at: new Date().toISOString(),
    runner: skill.manifest.runtime.type,
  };
  await defaultRunStore.create(run);

  const startedMs = Date.now();
  run.status = "running";
  run.started_at = new Date(startedMs).toISOString();
  await defaultRunStore.update(run);

  try {
    const execution = await withTimeout(
      runner.execute(skill, typedInput),
      skill.manifest.limits.timeout_seconds,
    );

    validateValue(skill.outputSchema, execution.output);
    run.output = execution.output;
    run.runner = execution.runner;
    run.provider = execution.provider;
    run.model = execution.model;
    run.status = "completed";
  } catch (error) {
    if (error instanceof SkillTimeoutError) {
      run.status = "timed_out";
      run.error_code = "TIMEOUT";
    } else {
      run.status = "failed";
      run.error_code = "EXECUTION_FAILED";
    }
    run.error = error instanceof Error ? error.message : "Unknown runtime error";
  }

  const completedMs = Date.now();
  run.completed_at = new Date(completedMs).toISOString();
  run.duration_ms = completedMs - startedMs;
  await defaultRunStore.update(run);
  return run;
}
