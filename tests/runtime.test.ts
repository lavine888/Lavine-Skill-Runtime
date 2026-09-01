import { describe, expect, it } from "vitest";
import { executeSkill, getRun, getSkill, listSkills } from "../runtime";

describe("Lavine Skill Runtime", () => {
  it("registers multiple skills without business logic in runtime core", () => {
    const ids = listSkills().map((skill) => skill.id);
    expect(ids).toContain("career-alpha-proof");
    expect(ids).toContain("career-alpha-position");
    expect(getSkill("career-alpha-proof")?.manifest.runtime.type).toBe("llm");
    expect(getSkill("career-alpha-position")?.manifest.runtime.type).toBe("llm");
  });

  it("rejects invalid input before execution", async () => {
    await expect(
      executeSkill("career-alpha-proof", {
        target_role: "AI PM",
        resume: "too short",
      }),
    ).rejects.toThrow("Schema validation failed");

    await expect(
      executeSkill("career-alpha-position", {
        target_role: "AI PM",
        current_material: "short",
      }),
    ).rejects.toThrow("Schema validation failed");
  });

  it("runs Career Proof through the generic demo pipeline", async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const run = await executeSkill("career-alpha-proof", {
      target_role: "AI Product Manager",
      resume: "Built an AI agent prototype and coordinated integration across a small project team.",
      evidence: "Public repository and demo deployment are available.",
    });

    expect(run.status).toBe("completed");
    expect(run.runner).toBe("demo");
    expect(run.skill_id).toBe("career-alpha-proof");
    expect(run.output).toBeTruthy();
    expect(getRun(run.id)?.id).toBe(run.id);

    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
  });

  it("runs Career Positioning through the same runtime core", async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const run = await executeSkill("career-alpha-position", {
      target_role: "Agent Engineer",
      current_material:
        "Built an agent workflow, documented failure cases, coordinated integration, and published a working repository with test evidence.",
      channel: "resume",
    });

    expect(run.status).toBe("completed");
    expect(run.runner).toBe("demo");
    expect(run.skill_id).toBe("career-alpha-position");
    expect(run.output).toMatchObject({
      positioning: {
        safe: expect.any(String),
        strong: expect.any(String),
        future: expect.any(String),
      },
    });

    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
  });
});
