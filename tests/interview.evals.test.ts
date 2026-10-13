import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixtures from "../evals/career-alpha-interview.json";
import { executeSkill } from "../runtime";
import { careerAlphaInterviewAdapter as adapter, type InterviewRiskMap } from "../skills/career-alpha-interview/adapter";

beforeEach(() => {
  vi.stubEnv("LLM_API_KEY", "");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("NODE_ENV", "test");
});
afterEach(() => vi.unstubAllEnvs());

describe("Interview deterministic demo regressions (not LLM semantic evals)", () => {
  for (const fixture of fixtures) {
    it(fixture.id, async () => {
      const first = await executeSkill(adapter.id, fixture.input);
      const second = await executeSkill(adapter.id, fixture.input);
      expect(first.status).toBe("completed");
      expect(first.provider).toBe("demo");
      expect(second.output).toEqual(first.output);
      const output = first.output as InterviewRiskMap;
      expect(Object.keys(output).sort()).toEqual(["questions", "risks"]);
      for (const risk of output.risks) {
        expect(fixture.input.resume).toContain(risk.claim);
        expect(risk.action).toBe("add_evidence");
        expect(risk.why_attackable).toContain("Demo only:");
        expect(risk.why_attackable).toMatch(/not.*(?:verified|analysis)/);
      }
      for (const question of output.questions) {
        expect(output.risks.some((risk) => risk.claim === question.targets)).toBe(true);
      }
    });
  }

  it("keeps embedded commands inside serialized user data, without changing the system contract", () => {
    const normal = adapter.buildMessages(fixtures[0].input);
    const injected = adapter.buildMessages(fixtures.find((fixture) => fixture.id === "embedded-instruction")!.input);
    expect(injected.system).toBe(normal.system);
    expect(JSON.parse(injected.user)).toEqual(fixtures.find((fixture) => fixture.id === "embedded-instruction")!.input);
    // This verifies message construction, not the model's resistance to injection.
  });

  it("treats omitted, empty and whitespace-only evidence consistently in demo mode", () => {
    const input = fixtures[0].input;
    expect(adapter.demo({ ...input, evidence: "" })).toEqual(adapter.demo(input));
    expect(adapter.demo({ ...input, evidence: "  " })).toEqual(adapter.demo(input));
  });

  it("bounds demo claim excerpts for maximum-size material", async () => {
    const run = await executeSkill(adapter.id, { target_role: "AI PM", resume: "x".repeat(30000), evidence: "e".repeat(30000) });
    expect(run.status).toBe("completed");
    expect((run.output as InterviewRiskMap).risks[0].claim.length).toBe(2000);
  });
});
