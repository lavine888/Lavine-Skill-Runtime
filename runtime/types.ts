export type RunStatus = "queued" | "running" | "completed" | "failed";

export type SkillManifest = {
  schema_version: string;
  id: string;
  name: string;
  description: string;
  version: string;
  source: { repo: string; path: string };
  runtime: { type: "llm"; adapter: string };
  input_schema: string;
  output_schema: string;
  artifacts: string[];
  limits: { timeout_seconds: number };
  tags?: string[];
};

export type SkillAdapter = {
  id: string;
  responseSchemaName: string;
  buildMessages(input: Record<string, unknown>): {
    system: string;
    user: string;
  };
  demo(input: Record<string, unknown>): unknown;
};

export type SkillDefinition = {
  manifest: SkillManifest;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  adapter: SkillAdapter;
};

export type RunRecord = {
  id: string;
  skill_id: string;
  skill_version: string;
  status: RunStatus;
  input: unknown;
  output?: unknown;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  runner: "openai" | "demo";
};
