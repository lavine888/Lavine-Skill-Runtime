import { isDemoExecutionAllowed } from "../demo";
import { RuntimeError } from "../errors";
import {
  createOpenAICompatibleProvider,
  hasConfiguredLlmProvider,
} from "../providers/openai-compatible";
import type {
  RunnerContext,
  RunnerExecution,
  SkillDefinition,
  SkillRunner,
} from "../types";

export const llmRunner: SkillRunner = {
  type: "llm",
  async execute(
    skill: SkillDefinition,
    input: Record<string, unknown>,
    context: RunnerContext,
  ): Promise<RunnerExecution> {
    if (skill.adapter.runtime !== "llm") {
      throw new RuntimeError(
        "RUNNER_UNAVAILABLE",
        `Skill ${skill.manifest.id} does not provide an LLM adapter.`,
        { httpStatus: 500 },
      );
    }

    if (!hasConfiguredLlmProvider()) {
      if (!isDemoExecutionAllowed()) {
        // Fail closed: never present deterministic demo output as a completed
        // product run in production. Configure a provider or opt in explicitly.
        throw new RuntimeError(
          "PROVIDER_AUTH_FAILED",
          "No LLM provider is configured. Set LLM_API_KEY (see .env.example), or explicitly enable deterministic demo execution with LLM_ALLOW_DEMO=1.",
          { retryable: false, httpStatus: 503 },
        );
      }

      return {
        output: skill.adapter.demo(input),
        runner: "llm",
        provider: "demo",
        model: "deterministic",
      };
    }

    const provider = createOpenAICompatibleProvider();
    const messages = skill.adapter.buildMessages(input);
    const response = await provider.generate({
      system: messages.system,
      user: messages.user,
      schemaName: skill.adapter.responseSchemaName,
      schema: skill.outputSchema,
      signal: context.signal,
    });

    return {
      output: response.output,
      runner: "llm",
      provider: response.provider,
      model: response.model,
    };
  },
};
