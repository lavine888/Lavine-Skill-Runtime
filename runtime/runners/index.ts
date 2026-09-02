import { RuntimeError } from "../errors";
import type { RuntimeType, SkillRunner } from "../types";
import { llmRunner } from "./llm";

const runners = new Map<RuntimeType, SkillRunner>([["llm", llmRunner]]);

export function getRunner(type: RuntimeType) {
  const runner = runners.get(type);
  if (!runner) {
    throw new RuntimeError(
      "RUNNER_UNAVAILABLE",
      `Unsupported runtime type: ${type}`,
      { retryable: false, httpStatus: 503 },
    );
  }
  return runner;
}

export function listRunnerTypes() {
  return Array.from(runners.keys());
}
