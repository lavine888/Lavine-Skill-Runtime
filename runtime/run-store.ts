import type { RunRecord } from "./types";

export interface RunStore {
  create(run: RunRecord): Promise<void>;
  update(run: RunRecord): Promise<void>;
  get(id: string): Promise<RunRecord | undefined>;
  getByIdempotency(skillId: string, key: string): Promise<RunRecord | undefined>;
  list(): Promise<RunRecord[]>;
}

declare global {
  // eslint-disable-next-line no-var
  var __lavineSkillRuns: Map<string, RunRecord> | undefined;
}

const memoryRuns = globalThis.__lavineSkillRuns ?? new Map<string, RunRecord>();
globalThis.__lavineSkillRuns = memoryRuns;

export class MemoryRunStore implements RunStore {
  async create(run: RunRecord) {
    memoryRuns.set(run.id, structuredClone(run));
  }

  async update(run: RunRecord) {
    memoryRuns.set(run.id, structuredClone(run));
  }

  async get(id: string) {
    const run = memoryRuns.get(id);
    return run ? structuredClone(run) : undefined;
  }

  async getByIdempotency(skillId: string, key: string) {
    for (const run of memoryRuns.values()) {
      if (run.skill_id === skillId && run.idempotency_key === key) {
        return structuredClone(run);
      }
    }
    return undefined;
  }

  async list() {
    return Array.from(memoryRuns.values())
      .map((run) => structuredClone(run))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export const defaultRunStore: RunStore = new MemoryRunStore();
