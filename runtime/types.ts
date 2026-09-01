export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "timed_out"
  | "cancelled";

export type RuntimeType = "llm" | "python" | "image";

export type SourceReference = {
  repo: string;
  path: string;
  ref: string;
  commit: string;
};

export type RuntimeSpec =
  | { type: "llm"; adapter: string }
  | { type: "python"; adapter: string; entrypoint: string }
  | { type: "image"; adapter: string; provider?: string };

export type SkillManifest = {
  schema_version: "1.0";
  id: string;
  name: string;
  description: string;
  version: string;
  source: SourceReference;
  runtime: RuntimeSpec;
  input_schema: string;
  output_schema: string;
  artifacts: string[];
  limits: { timeout_seconds: number };
  tags?: string[];
};

type BaseSkillAdapter = {
  id: string;
  demo(input: Record<string, unknown>): unknown;
};

export type LlmSkillAdapter = BaseSkillAdapter & {
  runtime: "llm";
  responseSchemaName: string;
  buildMessages(input: Record<string, unknown>): {
    system: string;
    user: string;
  };
};

export type PythonSkillAdapter = BaseSkillAdapter & {
  runtime: "python";
};

export type ImageSkillAdapter = BaseSkillAdapter & {
  runtime: "image";
};

export type SkillAdapter = LlmSkillAdapter | PythonSkillAdapter | ImageSkillAdapter;

export type SkillDefinition = {
  manifest: SkillManifest;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  adapter: SkillAdapter;
};

export type RunnerExecution = {
  output: unknown;
  runner: RuntimeType;
  provider?: string;
  model?: string;
};

export type SkillRunner = {
  type: RuntimeType;
  execute(
    skill: SkillDefinition,
    input: Record<string, unknown>,
  ): Promise<RunnerExecution>;
};

export type RunRecord = {
  id: string;
  skill_id: string;
  skill_version: string;
  source: SourceReference;
  status: RunStatus;
  input: unknown;
  output?: unknown;
  error?: string;
  error_code?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  runner: RuntimeType;
  provider?: string;
  model?: string;
};
