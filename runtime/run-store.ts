import type { RunRecord } from "./types";

export type CreateRunResult =
  | { created: true; run: RunRecord }
  | { created: false; run: RunRecord };

export interface RunStore {
  create(run: RunRecord): Promise<CreateRunResult>;
  update(run: RunRecord): Promise<void>;
  get(id: string): Promise<RunRecord | undefined>;
  list(): Promise<RunRecord[]>;
}

declare global {
  // eslint-disable-next-line no-var
  var __lavineSkillRuns: Map<string, RunRecord> | undefined;
}

const memoryRuns = globalThis.__lavineSkillRuns ?? new Map<string, RunRecord>();
globalThis.__lavineSkillRuns = memoryRuns;

export class MemoryRunStore implements RunStore {
  async create(run: RunRecord): Promise<CreateRunResult> {
    if (run.idempotency_key) {
      for (const existing of memoryRuns.values()) {
        if (
          existing.skill_id === run.skill_id &&
          existing.idempotency_key === run.idempotency_key
        ) {
          return { created: false, run: structuredClone(existing) };
        }
      }
    }

    memoryRuns.set(run.id, structuredClone(run));
    return { created: true, run: structuredClone(run) };
  }

  async update(run: RunRecord) {
    memoryRuns.set(run.id, structuredClone(run));
  }

  async get(id: string) {
    const run = memoryRuns.get(id);
    return run ? structuredClone(run) : undefined;
  }

  async list() {
    return Array.from(memoryRuns.values())
      .map((run) => structuredClone(run))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export const defaultRunStore: RunStore = new MemoryRunStore();
