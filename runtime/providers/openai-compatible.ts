import OpenAI from "openai";

export type LlmRequest = {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
};

export type LlmResponse = {
  output: unknown;
  provider: string;
  model: string;
};

export interface LlmProvider {
  id: string;
  model: string;
  generate(request: LlmRequest): Promise<LlmResponse>;
}

export function hasConfiguredLlmProvider() {
  return Boolean(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY);
}

export function createOpenAICompatibleProvider(): LlmProvider {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No LLM API key configured.");

  const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini";
  const provider = process.env.LLM_PROVIDER || "openai-compatible";
  const baseURL = process.env.LLM_BASE_URL || undefined;
  const client = new OpenAI({ apiKey, baseURL });

  return {
    id: provider,
    model,
    async generate(request) {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: request.schemaName,
            strict: true,
            schema: request.schema,
          },
        },
      });

      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error("Model returned no content.");

      return {
        output: JSON.parse(text),
        provider,
        model,
      };
    },
  };
}
