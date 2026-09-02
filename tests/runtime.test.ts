import { describe, expect, it } from "vitest";
import {
  executeSkill,
  getRun,
  getSkill,
  listSkills,
  RuntimeError,
  supportedRuntimeTypes,
} from "../runtime";

describe("Lavine Skill Runtime runnable boundary", () => {
  it("registers reviewed skills and only advertises implemented runners", () => {
    const ids = listSkills().map((skill) => skill.id);
    expect(ids).toContain("career-alpha-proof");
    expect(ids).toContain("career-alpha-position");
    expect(ids).toContain("buffett-moat-rule-check");
    expect(getSkill("career-alpha-proof")?.manifest.runtime.type).toBe("llm");
    expect(getSkill("career-alpha-position")?.manifest.runtime.type).toBe("llm");
    expect(getSkill("buffett-moat-rule-check")?.manifest.runtime.type).toBe("python");
    expect(supportedRuntimeTypes()).toEqual(["llm", "python"]);
  });

  it("pins every registered source and declares bounded resources", () => {
    for (const skill of listSkills()) {
      expect(skill.source.ref.length).toBeGreaterThan(0);
      expect(skill.source.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(skill.limits.timeout_seconds).toBeGreaterThan(0);
      expect(skill.limits.max_input_bytes).toBeGreaterThan(0);
      expect(skill.limits.max_output_bytes).toBeGreaterThan(0);
      expect(skill.limits.max_concurrency).toBeGreaterThan(0);
    }
  });

  it("rejects invalid input with a typed non-retryable error", async () => {
    try {
      await executeSkill("career-alpha-proof", {
        target_role: "AI PM",
        resume: "too short",
      });
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeError);
      expect((error as RuntimeError).code).toBe("INPUT_INVALID");
      expect((error as RuntimeError).retryable).toBe(false);
    }
  });

  it("runs Career Proof through the generic LLM runner and RunStore", async () => {
    const previousLlmKey = process.env.LLM_API_KEY;
    const previousOpenAiKey = process.env.OPENAI_API_KEY;
    delete process.env.LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const run = await executeSkill("career-alpha-proof", {
        target_role: "AI Product Manager",
        resume: "Built an AI agent prototype and coordinated integration across a small project team.",
        evidence: "Public repository and demo deployment are available.",
      });

      expect(run.status).toBe("completed");
      expect(run.runner).toBe("llm");
      expect(run.provider).toBe("demo");
      expect(run.model).toBe("deterministic");
      expect(run.skill_id).toBe("career-alpha-proof");
      expect(run.duration_ms).toBeTypeOf("number");
      expect(run.input_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(run.source.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(run.output).toBeTruthy();
      expect((await getRun(run.id))?.id).toBe(run.id);
    } finally {
      if (previousLlmKey) process.env.LLM_API_KEY = previousLlmKey;
      else delete process.env.LLM_API_KEY;
      if (previousOpenAiKey) process.env.OPENAI_API_KEY = previousOpenAiKey;
      else delete process.env.OPENAI_API_KEY;
    }
  });

  it("runs a reviewed Python Skill through the same core", async () => {
    const run = await executeSkill("buffett-moat-rule-check", {
      symbol: "600519.SH",
      roe_latest_pct: 30,
      roe_10y_min_pct: 18,
      gross_margin_latest_pct: 90,
      gross_margin_volatility_pp: 3,
      net_profit_positive: true,
      capex_to_net_profit_pct: 12,
      debt_to_net_profit_ratio: 0.5,
      pe_ttm: 20,
    });

    expect(run.status).toBe("completed");
    expect(run.runner).toBe("python");
    expect(run.provider).toBe("local-subprocess");
    expect(run.output).toMatchObject({
      symbol: "600519.SH",
      status: "pass",
      failed_rules: [],
      checks: {
        roe: true,
        gross_margin: true,
        profit: true,
        capital_intensity: true,
        debt: true,
        valuation: true,
      },
    });
  });

  it("returns deterministic failed rules from the Python Skill", async () => {
    const run = await executeSkill("buffett-moat-rule-check", {
      symbol: "DEMO",
      roe_latest_pct: 14,
      roe_10y_min_pct: 11,
      gross_margin_latest_pct: 35,
      gross_margin_volatility_pp: 12,
      net_profit_positive: true,
      capex_to_net_profit_pct: 20,
      debt_to_net_profit_ratio: 2,
      pe_ttm: 30,
    });

    expect(run.status).toBe("completed");
    expect(run.output).toMatchObject({
      status: "fail",
      failed_rules: ["roe", "gross_margin", "valuation"],
    });
  });

  it("replays the same idempotent request without executing a second run", async () => {
    const previousLlmKey = process.env.LLM_API_KEY;
    const previousOpenAiKey = process.env.OPENAI_API_KEY;
    delete process.env.LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const input = {
        target_role: "AI Product Manager",
        resume: "Built an AI product workflow with a public repository and documented integration decisions.",
        evidence: "Repository, test evidence, and a working demo are available.",
      };
      const key = `test-${crypto.randomUUID()}`;

      const first = await executeSkill("career-alpha-proof", input, {
        idempotencyKey: key,
      });
      const replay = await executeSkill("career-alpha-proof", input, {
        idempotencyKey: key,
      });

      expect(replay.id).toBe(first.id);
      expect(replay.input_hash).toBe(first.input_hash);
      expect(replay.idempotency_key).toBe(key);
    } finally {
      if (previousLlmKey) process.env.LLM_API_KEY = previousLlmKey;
      else delete process.env.LLM_API_KEY;
      if (previousOpenAiKey) process.env.OPENAI_API_KEY = previousOpenAiKey;
      else delete process.env.OPENAI_API_KEY;
    }
  });

  it("atomically deduplicates concurrent requests with the same idempotency key", async () => {
    const previousLlmKey = process.env.LLM_API_KEY;
    const previousOpenAiKey = process.env.OPENAI_API_KEY;
    delete process.env.LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const input = {
        target_role: "AI Product Manager",
        resume: "Built a concurrent-safe AI workflow with public artifacts, test evidence, and documented delivery decisions.",
        evidence: "Repository and deterministic test evidence are available.",
      };
      const key = `parallel-${crypto.randomUUID()}`;

      const [first, second] = await Promise.all([
        executeSkill("career-alpha-proof", input, { idempotencyKey: key }),
        executeSkill("career-alpha-proof", input, { idempotencyKey: key }),
      ]);

      expect(second.id).toBe(first.id);
      expect(second.input_hash).toBe(first.input_hash);
    } finally {
      if (previousLlmKey) process.env.LLM_API_KEY = previousLlmKey;
      else delete process.env.LLM_API_KEY;
      if (previousOpenAiKey) process.env.OPENAI_API_KEY = previousOpenAiKey;
      else delete process.env.OPENAI_API_KEY;
    }
  });

  it("rejects reuse of an idempotency key with different input", async () => {
    const previousLlmKey = process.env.LLM_API_KEY;
    const previousOpenAiKey = process.env.OPENAI_API_KEY;
    delete process.env.LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const key = `conflict-${crypto.randomUUID()}`;
      await executeSkill(
        "career-alpha-proof",
        {
          target_role: "AI Product Manager",
          resume: "Built a documented AI workflow with a public artifact and clear project responsibilities.",
        },
        { idempotencyKey: key },
      );

      await expect(
        executeSkill(
          "career-alpha-proof",
          {
            target_role: "Agent Engineer",
            resume: "Built a different agent workflow with different evidence and a different target role.",
          },
          { idempotencyKey: key },
        ),
      ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    } finally {
      if (previousLlmKey) process.env.LLM_API_KEY = previousLlmKey;
      else delete process.env.LLM_API_KEY;
      if (previousOpenAiKey) process.env.OPENAI_API_KEY = previousOpenAiKey;
      else delete process.env.OPENAI_API_KEY;
    }
  });

  it("runs Career Positioning through the same core without special cases", async () => {
    const previousLlmKey = process.env.LLM_API_KEY;
    const previousOpenAiKey = process.env.OPENAI_API_KEY;
    delete process.env.LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const run = await executeSkill("career-alpha-position", {
        target_role: "Agent Engineer",
        current_material:
          "Built an agent workflow, documented failure cases, coordinated integration, and published a working repository with test evidence.",
        channel: "resume",
      });

      expect(run.status).toBe("completed");
      expect(run.runner).toBe("llm");
      expect(run.provider).toBe("demo");
      expect(run.skill_id).toBe("career-alpha-position");
      expect(run.output).toMatchObject({
        positioning: {
          safe: expect.any(String),
          strong: expect.any(String),
          future: expect.any(String),
        },
      });
    } finally {
      if (previousLlmKey) process.env.LLM_API_KEY = previousLlmKey;
      else delete process.env.LLM_API_KEY;
      if (previousOpenAiKey) process.env.OPENAI_API_KEY = previousOpenAiKey;
      else delete process.env.OPENAI_API_KEY;
    }
  });
});
