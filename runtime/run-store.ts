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

const DEFAULT_MAX_RUNS = 1000;

function parseMaxRuns() {
  const parsed = Number(process.env.RUN_STORE_MAX_RUNS);
  if (Number.isInteger(parsed) && parsed >= 1) return parsed;
  return DEFAULT_MAX_RUNS;
}

/**
 * In-memory development store.
 *
 * - Atomic idempotent creation inside a single process, using an O(1)
 *   `(skill_id, idempotency_key)` index instead of a full scan.
 * - Bounded size: the oldest-created runs are evicted beyond `maxRuns`
 *   (RUN_STORE_MAX_RUNS, default 1000). A replay of an evicted idempotency
 *   key creates a new Run, which keeps the memory footprint bounded.
 * - Persistent stores must provide the same atomic creation semantics with a
 *   uniqueness constraint (see docs/ARCHITECTURE.md).
 */
export class MemoryRunStore implements RunStore {
  private readonly index = new Map<string, string>();

  constructor(readonly maxRuns: number = parseMaxRuns()) {
    // Rebuild the idempotency index if the shared map survived a module
    // reload (dev/HMR) while this instance did not.
    for (const run of memoryRuns.values()) {
      if (run.idempotency_key) {
        this.index.set(this.indexKey(run.skill_id, run.idempotency_key), run.id);
      }
    }
  }

  private indexKey(skillId: string, idempotencyKey: string) {
    return `${skillId}\u0000${idempotencyKey}`;
  }

  async create(run: RunRecord): Promise<CreateRunResult> {
    if (run.idempotency_key) {
      const existingId = this.index.get(this.indexKey(run.skill_id, run.idempotency_key));
      if (existingId) {
        const existing = memoryRuns.get(existingId);
        if (existing) {
          return { created: false, run: structuredClone(existing) };
        }
      }
    }

    memoryRuns.set(run.id, structuredClone(run));
    if (run.idempotency_key) {
      this.index.set(this.indexKey(run.skill_id, run.idempotency_key), run.id);
    }
    this.evictBeyondLimit();
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

  private evictBeyondLimit() {
    while (memoryRuns.size > this.maxRuns) {
      const oldestId = memoryRuns.keys().next().value;
      if (oldestId === undefined) break;
      const evicted = memoryRuns.get(oldestId);
      memoryRuns.delete(oldestId);
      if (evicted?.idempotency_key) {
        const key = this.indexKey(evicted.skill_id, evicted.idempotency_key);
        if (this.index.get(key) === evicted.id) this.index.delete(key);
      }
    }
  }
}

export const defaultRunStore: RunStore = new MemoryRunStore();
