import { mkdir, writeFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fixtures from "../evals/career-alpha-interview.json";
import { executeSkill, hasConfiguredLlmProvider, type RunRecord } from "../runtime";
import type { InterviewRiskMap } from "../skills/career-alpha-interview/adapter";

// Explicit opt-in command only; excluded from npm test/evals and CI.
// This suite records real outputs for manual semantic review, not an automated quality score.
const results: Array<{ case_id: string; review_rubric: string; semantic_status: string; run: RunRecord }> = [];

beforeAll(() => {
  if (!hasConfiguredLlmProvider()) {
    throw new Error("Live evaluation requires LLM_API_KEY or OPENAI_API_KEY in the shell environment. Demo fallback is not a live evaluation.");
  }
});

afterAll(async () => {
  if (!results.length) return;
  await mkdir(".interview-eval", { recursive: true });
  const reportPath = `.interview-eval/${Date.now()}-${crypto.randomUUID()}.json`;
  await writeFile(reportPath, JSON.stringify({
    created_at: new Date().toISOString(),
    note: "Synthetic cases. Contract/anchoring assertions are automated; all semantic rubrics require manual review. This is not a hiring-outcome evaluation.",
    results,
  }, null, 2) + "\n", { flag: "wx" });
  console.log(`Live outputs saved to ${reportPath}; semantic review remains pending.`);
});

describe("Interview live provider collection and contract checks", () => {
  for (const fixture of fixtures) {
    it(fixture.id, async () => {
      const run = await executeSkill("career-alpha-interview", fixture.input);
      results.push({ case_id: fixture.id, review_rubric: fixture.review, semantic_status: "pending_manual_review", run });
      expect(run.status).toBe("completed");
      expect(run.provider).toBeTruthy();
      expect(run.provider).not.toBe("demo");
      expect(run.model).not.toBe("deterministic");
      const output = run.output as InterviewRiskMap;
      for (const risk of output.risks) expect(fixture.input.resume).toContain(risk.claim);
      for (const question of output.questions) {
        expect(output.risks.some((risk) => risk.claim === question.targets)).toBe(true);
      }
    }, 130000);
  }
});
