import OpenAI from "openai";
import { RuntimeError } from "../errors";

export type LlmRequest = {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  signal?: AbortSignal;
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

function providerError(error: unknown) {
  const candidate = error as {
    status?: number;
    code?: string;
    name?: string;
    message?: string;
  };
  const message = candidate?.message || "LLM provider request failed.";

  if (candidate?.status === 401 || candidate?.status === 403) {
    return new RuntimeError("PROVIDER_AUTH_FAILED", message, {
      retryable: false,
      httpStatus: 502,
      cause: error,
    });
  }

  if (candidate?.status === 429) {
    return new RuntimeError("PROVIDER_RATE_LIMITED", message, {
      retryable: true,
      httpStatus: 503,
      cause: error,
    });
  }

  if (
    candidate?.name === "APITimeoutError" ||
    candidate?.name === "APIUserAbortError" ||
    candidate?.name === "AbortError" ||
    candidate?.code === "ETIMEDOUT" ||
    candidate?.code === "ECONNABORTED"
  ) {
    return new RuntimeError("PROVIDER_TIMEOUT", message, {
      retryable: true,
      httpStatus: 504,
      cause: error,
    });
  }

  return new RuntimeError("PROVIDER_FAILED", message, {
    retryable: true,
    httpStatus: 502,
    cause: error,
  });
}

export function createOpenAICompatibleProvider(): LlmProvider {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new RuntimeError("PROVIDER_AUTH_FAILED", "No LLM API key configured.", {
      httpStatus: 500,
    });
  }

  const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini";
  const provider = process.env.LLM_PROVIDER || "openai-compatible";
  const baseURL = process.env.LLM_BASE_URL || undefined;
  const client = new OpenAI({ apiKey, baseURL });

  return {
    id: provider,
    model,
    async generate(request) {
      try {
        const completion = await client.chat.completions.create(
          {
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
          },
          { signal: request.signal },
        );

        const text = completion.choices[0]?.message?.content;
        if (!text) {
          throw new RuntimeError("PROVIDER_FAILED", "Model returned no content.", {
            retryable: true,
            httpStatus: 502,
          });
        }

        let output: unknown;
        try {
          output = JSON.parse(text);
        } catch (error) {
          throw new RuntimeError("OUTPUT_INVALID", "Model returned invalid JSON.", {
            retryable: false,
            httpStatus: 502,
            cause: error,
          });
        }

        return { output, provider, model };
      } catch (error) {
        if (error instanceof RuntimeError) throw error;
        throw providerError(error);
      }
    },
  };
}
