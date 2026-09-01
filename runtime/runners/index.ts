import { llmRunner } from "./llm";
import type { RuntimeType, SkillRunner } from "../types";

const runners = new Map<RuntimeType, SkillRunner>([["llm", llmRunner]]);

export function getRunner(type: RuntimeType) {
  const runner = runners.get(type);
  if (!runner) {
    throw new Error(`Unsupported runtime type: ${type}`);
  }
  return runner;
}

export function listRunnerTypes() {
  return Array.from(runners.keys());
}
