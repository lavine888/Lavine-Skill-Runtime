import { describe, expect, it } from "vitest";
import { executeSkill, getRun, getSkill, listSkills } from "../runtime";

describe("Lavine Skill Runtime MVP", () => {
  it("registers Career Alpha proof", () => {
    expect(listSkills().map((skill) => skill.id)).toContain("career-alpha-proof");
    expect(getSkill("career-alpha-proof")?.manifest.runtime.type).toBe("llm");
  });

  it("rejects invalid input before execution", async () => {
    await expect(
      executeSkill("career-alpha-proof", {
        target_role: "AI PM",
        resume: "too short",
      }),
    ).rejects.toThrow("Schema validation failed");
  });

  it("runs the full pipeline with the deterministic demo runner", async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const run = await executeSkill("career-alpha-proof", {
      target_role: "AI Product Manager",
      resume: "Built an AI agent prototype and coordinated integration across a small project team.",
      evidence: "Public repository and demo deployment are available.",
    });

    expect(run.status).toBe("completed");
    expect(run.runner).toBe("demo");
    expect(run.output).toBeTruthy();
    expect(getRun(run.id)?.id).toBe(run.id);

    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
  });
});
