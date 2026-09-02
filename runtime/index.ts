import { skillDefinitions } from "../skills/registry";
import { asRuntimeError, RuntimeError } from "./errors";
import { hashInput } from "./idempotency";
import {
  acquireSkillSlot,
  assertInputWithinLimits,
  assertOutputWithinLimits,
} from "./limits";
import { buildRegistry } from "./registry";
import { defaultRunStore } from "./run-store";
import { getRunner, listRunnerTypes } from "./runners";
import { validateValue } from "./schema";
import type { ExecuteSkillOptions, RunRecord } from "./types";

export type {
  ExecuteSkillOptions,
  RunRecord,
  RunStatus,
  RuntimeType,
  SkillAdapter,
  SkillDefinition,
  SkillManifest,
  SkillRunner,
  SourceReference,
} from "./types";
export { RuntimeError } from "./errors";

const registry = buildRegistry(skillDefinitions);

async function withTimeout<T>(promise: Promise<T>, timeoutSeconds: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new RuntimeError(
            "EXECUTION_TIMEOUT",
            `Skill execution timed out after ${timeoutSeconds}s`,
            { retryable: true, httpStatus: 504 },
          ),
        ),
      timeoutSeconds * 1000,
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeIdempotencyKey(key?: string) {
  if (key === undefined) return undefined;
  const normalized = key.trim();
  if (!normalized) return undefined;
  if (normalized.length > 128) {
    throw new RuntimeError(
      "INPUT_INVALID",
      "Idempotency key must be 128 characters or fewer.",
      { httpStatus: 400 },
    );
  }
  return normalized;
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

export async function executeSkill(
  id: string,
  input: unknown,
  options: ExecuteSkillOptions = {},
): Promise<RunRecord> {
  const skill = registry.get(id);
  if (!skill) {
    throw new RuntimeError("UNKNOWN_SKILL", `Unknown skill: ${id}`, {
      httpStatus: 404,
    });
  }

  validateValue(skill.inputSchema, input, "input");
  assertInputWithinLimits(skill.manifest, input);
  const typedInput = input as Record<string, unknown>;
  const inputHash = hashInput(input);
  const idempotencyKey = normalizeIdempotencyKey(options.idempotencyKey);

  if (idempotencyKey) {
    const existing = await defaultRunStore.getByIdempotency(id, idempotencyKey);
    if (existing) {
      if (existing.input_hash !== inputHash) {
        throw new RuntimeError(
          "IDEMPOTENCY_CONFLICT",
          "The same idempotency key was already used with different input.",
          { retryable: false, httpStatus: 409 },
        );
      }
      return existing;
    }
  }

  const runner = getRunner(skill.manifest.runtime.type);
  const releaseSlot = acquireSkillSlot(skill.manifest);

  const run: RunRecord = {
    id: crypto.randomUUID(),
    skill_id: skill.manifest.id,
    skill_version: skill.manifest.version,
    source: structuredClone(skill.manifest.source),
    status: "queued",
    input,
    input_hash: inputHash,
    idempotency_key: idempotencyKey,
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

    assertOutputWithinLimits(skill.manifest, execution.output);
    validateValue(skill.outputSchema, execution.output, "output");
    run.output = execution.output;
    run.runner = execution.runner;
    run.provider = execution.provider;
    run.model = execution.model;
    run.status = "completed";
  } catch (error) {
    const runtimeError = asRuntimeError(error);
    run.status = runtimeError.code === "EXECUTION_TIMEOUT" ? "timed_out" : "failed";
    run.error_code = runtimeError.code;
    run.retryable = runtimeError.retryable;
    run.error = runtimeError.message;
  } finally {
    releaseSlot();
  }

  const completedMs = Date.now();
  run.completed_at = new Date(completedMs).toISOString();
  run.duration_ms = completedMs - startedMs;
  await defaultRunStore.update(run);
  return run;
}
