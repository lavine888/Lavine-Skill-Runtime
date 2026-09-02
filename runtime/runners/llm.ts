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
      throw new Error(`Skill ${skill.manifest.id} does not provide an LLM adapter.`);
    }

    if (!hasConfiguredLlmProvider()) {
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
