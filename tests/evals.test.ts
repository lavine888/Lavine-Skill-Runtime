import fixtures from "../evals/career-alpha.json";
import { describe, expect, it } from "vitest";
import { executeSkill } from "../runtime";

function asRecord(value: unknown) {
  return value as Record<string, unknown>;
}

describe("Career Alpha behavior evals", () => {
  for (const fixture of fixtures) {
    it(fixture.name, async () => {
      const previousLlmKey = process.env.LLM_API_KEY;
      const previousOpenAiKey = process.env.OPENAI_API_KEY;
      delete process.env.LLM_API_KEY;
      delete process.env.OPENAI_API_KEY;

      try {
        const run = await executeSkill(fixture.skill_id, fixture.input);
        expect(run.status).toBe("completed");
        const output = asRecord(run.output);

        if (fixture.skill_id === "career-alpha-proof") {
          const claims = output.claims as Array<Record<string, unknown>>;
          expect(claims[0]?.confidence).toBe(fixture.expect.claim_confidence);
          expect(claims[0]?.confidence).not.toBe("VERIFIED");
        }

        if (fixture.skill_id === "career-alpha-position") {
          const positioning = output.positioning as Record<string, string>;
          expect(output.next_skill).toBe(fixture.expect.next_skill);
          if (fixture.expect.distinct_positioning) {
            expect(positioning.safe).not.toBe(positioning.future);
            expect(positioning.strong).not.toBe(positioning.future);
          }
        }
      } finally {
        if (previousLlmKey) process.env.LLM_API_KEY = previousLlmKey;
        else delete process.env.LLM_API_KEY;
        if (previousOpenAiKey) process.env.OPENAI_API_KEY = previousOpenAiKey;
        else delete process.env.OPENAI_API_KEY;
      }
    });
  }
});
