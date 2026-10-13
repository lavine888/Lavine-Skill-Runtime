import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeSkill, getRun, getSkill, listSkills } from "../runtime";
import * as providers from "../runtime/providers/openai-compatible";
import { validateValue } from "../runtime/schema";
import { careerAlphaInterviewAdapter as adapter } from "../skills/career-alpha-interview/adapter";

const input = {
  target_role: "AI Product Manager",
  resume: "Led delivery of an AI prototype with a small team.",
};

beforeEach(() => {
  vi.stubEnv("LLM_API_KEY", "");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("NODE_ENV", "test");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Interview Risk Map contract", () => {
  it("registers the pinned source and persists a schema-valid demo through the generic runner", async () => {
    expect(listSkills().map((skill) => skill.id)).toContain(adapter.id);
    const run = await executeSkill(adapter.id, input);
    expect(run).toMatchObject({
      status: "completed", runner: "llm", provider: "demo", model: "deterministic",
      source: { repo: "lavine888/career-alpha", path: "skills/interview/SKILL.md",
        ref: "main", commit: "c70c071771a808f618fb43c034de9c04c52276f4" },
    });
    expect((await getRun(run.id))?.output).toEqual(adapter.demo(input));
  });

  it.each([
    { resume: input.resume },
    { target_role: input.target_role },
    { ...input, target_role: 42 },
    { ...input, resume: "short" },
    { ...input, resume: " ".repeat(20) },
    { ...input, target_role: "  " },
    { ...input, evidence: null },
    { ...input, transcript: [] },
    { ...input, resume: "x".repeat(30001) },
  ])("rejects invalid input before invoking a runner: %j", async (invalid) => {
    const demo = vi.spyOn(adapter, "demo");
    const provider = vi.spyOn(providers, "createOpenAICompatibleProvider");
    await expect(executeSkill(adapter.id, invalid)).rejects.toMatchObject({
      code: "INPUT_INVALID", retryable: false,
    });
    expect(demo).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });

  it("replays the same run and rejects a different input with the same key", async () => {
    const demo = vi.spyOn(adapter, "demo");
    const options = { idempotencyKey: crypto.randomUUID() };
    const first = await executeSkill(adapter.id, input, options);
    const replay = await executeSkill(adapter.id, { ...input }, options);
    expect(replay.id).toBe(first.id);
    expect(demo).toHaveBeenCalledTimes(1);
    await expect(executeSkill(adapter.id, { ...input, evidence: "Different material" }, options))
      .rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it.each([
    { ...adapter.demo(input), score: 99 },
    { risks: [{ ...adapter.demo(input).risks[0], verified: true }], questions: [] },
    { risks: [], questions: [{ question: "Why?", targets: input.resume, answer: "Invented" }] },
    { risks: [{ ...adapter.demo(input).risks[0], action: "bluff" }], questions: [] },
    { risks: Array(9).fill(adapter.demo(input).risks[0]), questions: [] },
  ])("marks malformed provider output as OUTPUT_INVALID: %j", async (output) => {
    vi.stubEnv("LLM_API_KEY", "local-test-key");
    vi.spyOn(providers, "createOpenAICompatibleProvider").mockReturnValue({
      id: "test-provider", model: "test-model",
      generate: vi.fn().mockResolvedValue({ output, provider: "test-provider", model: "test-model" }),
    });
    const demo = vi.spyOn(adapter, "demo");
    const run = await executeSkill(adapter.id, input);
    expect(run).toMatchObject({ status: "failed", error_code: "OUTPUT_INVALID", retryable: false });
    expect(run.output).toBeUndefined();
    expect(demo).not.toHaveBeenCalled();
  });

  it("passes the Skill prompt and schema to the provider and preserves its validated result", async () => {
    vi.stubEnv("LLM_API_KEY", "local-test-key");
    const output = {
      risks: [{ claim: input.resume, why_attackable: "Team scope needs a contribution artifact.", action: "add_evidence" }],
      questions: [{ question: "Which delivery decisions were yours?", targets: input.resume }],
    };
    const generate = vi.fn().mockResolvedValue({ output, provider: "test-provider", model: "test-model" });
    vi.spyOn(providers, "createOpenAICompatibleProvider").mockReturnValue({ id: "test-provider", model: "test-model", generate });
    const run = await executeSkill(adapter.id, input);
    expect(run).toMatchObject({ status: "completed", provider: "test-provider", model: "test-model", output });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      ...adapter.buildMessages(input), schemaName: adapter.responseSchemaName,
      schema: getSkill(adapter.id)!.outputSchema, signal: expect.any(AbortSignal),
    }));
  });

  it("permits an empty risk map rather than forcing an invented weakness", () => {
    expect(() => validateValue(getSkill(adapter.id)!.outputSchema, { risks: [], questions: [] }, "output"))
      .not.toThrow();
  });

  it("keeps production fail-closed when no provider or demo opt-in exists", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LLM_ALLOW_DEMO", "");
    const run = await executeSkill(adapter.id, input);
    expect(run).toMatchObject({ status: "failed", error_code: "PROVIDER_AUTH_FAILED", error_http_status: 503 });
  });
});
