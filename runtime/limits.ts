import { RuntimeError } from "./errors";
import type { SkillManifest } from "./types";

const activeRuns = new Map<string, number>();

function jsonSizeBytes(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export function assertInputWithinLimits(manifest: SkillManifest, input: unknown) {
  const size = jsonSizeBytes(input);
  if (size > manifest.limits.max_input_bytes) {
    throw new RuntimeError(
      "INPUT_TOO_LARGE",
      `Input is ${size} bytes; limit is ${manifest.limits.max_input_bytes} bytes.`,
      { httpStatus: 413 },
    );
  }
}

export function assertOutputWithinLimits(manifest: SkillManifest, output: unknown) {
  const size = jsonSizeBytes(output);
  if (size > manifest.limits.max_output_bytes) {
    throw new RuntimeError(
      "OUTPUT_TOO_LARGE",
      `Output is ${size} bytes; limit is ${manifest.limits.max_output_bytes} bytes.`,
      { httpStatus: 500 },
    );
  }
}

export function acquireSkillSlot(manifest: SkillManifest) {
  const current = activeRuns.get(manifest.id) ?? 0;
  if (current >= manifest.limits.max_concurrency) {
    throw new RuntimeError(
      "CONCURRENCY_LIMIT",
      `Skill ${manifest.id} already has ${current} active run(s); limit is ${manifest.limits.max_concurrency}.`,
      { retryable: true, httpStatus: 429 },
    );
  }

  activeRuns.set(manifest.id, current + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = Math.max(0, (activeRuns.get(manifest.id) ?? 1) - 1);
    if (next === 0) activeRuns.delete(manifest.id);
    else activeRuns.set(manifest.id, next);
  };
}
