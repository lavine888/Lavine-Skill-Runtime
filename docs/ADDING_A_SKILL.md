# Adding a Skill

A Skill should extend the catalog without adding business-specific branches to Runtime Core.

## 1. Scaffold from the CLI

```bash
npm run skill:init -- \
  example-skill \
  owner/source-repo \
  skills/example/SKILL.md \
  0123456789abcdef0123456789abcdef01234567 \
  llm
```

Use `python` as the final argument for a Python Skill.

Then run:

```bash
npm run skill:validate
npm run skill:list
```

The scaffold is not approval. Review the source pin, schemas, limits, adapter and any Python entrypoint before registration.

## 2. Package shape

LLM Skill:

```text
skills/<skill-id>/
├── manifest.json
├── input.schema.json
├── output.schema.json
├── prompt.ts
└── adapter.ts
```

Python Skill:

```text
skills/<skill-id>/
├── manifest.json
├── input.schema.json
├── output.schema.json
├── adapter.ts
└── runner.py
```

## 3. Manifest contract

The canonical schema is `runtime/manifest.schema.json`.

LLM runtime:

```json
{
  "type": "llm",
  "adapter": "example-skill"
}
```

Python runtime:

```json
{
  "type": "python",
  "adapter": "example-python-skill",
  "entrypoint": "runner.py"
}
```

Only `llm` and `python` are valid in Manifest v1 because those are the execution paths implemented today.

Every manifest must also pin:

```text
source.repo
source.path
source.ref
source.commit   # full 40-character SHA
```

and declare enforced limits:

```json
{
  "limits": {
    "timeout_seconds": 120,
    "max_input_bytes": 262144,
    "max_output_bytes": 1048576,
    "max_concurrency": 2
  }
}
```

Do not add policy fields that Runtime does not enforce.

## 4. Schemas

Inputs and outputs must compile as JSON Schema 2020-12.

Workbench currently supports schema-generated `string`, `number`, `integer`, `boolean`, and scalar `enum` inputs. Prefer explicit small contracts and `additionalProperties: false` for structured objects.

Outputs should be stable product JSON, not free-form terminal/chat transcripts.

## 5. LLM adapter

An LLM adapter owns Skill-specific prompting and deterministic demo behavior:

```ts
export const exampleAdapter: LlmSkillAdapter = {
  id: "example-skill",
  runtime: "llm",
  responseSchemaName: "example_result",
  buildMessages(input) {
    return {
      system: "Reviewed system contract...",
      user: JSON.stringify(input),
    };
  },
  demo(input) {
    return { summary: String(input.goal || "") };
  },
};
```

Provider access belongs in the LLM runner/provider layer, not in the Skill.

## 6. Python adapter and entrypoint

The Python adapter only declares identity/runtime:

```ts
export const examplePythonAdapter: PythonSkillAdapter = {
  id: "example-python-skill",
  runtime: "python",
};
```

The entrypoint contract is deliberately narrow:

```text
stdin  = one JSON value
stdout = one JSON value
stderr = diagnostics only
exit 0 = success
nonzero exit = execution failure
```

The entrypoint must live inside its own Skill directory. Runtime invokes it with `shell: false`, a small environment allowlist, bounded stdout and cancellation/timeout support.

Do not register arbitrary uploaded Python or user-selected commands.

## 7. Register

Add the reviewed `SkillDefinition` to `skills/registry.ts`.

Editing the catalog boundary is expected. Adding business dispatch such as this is not:

```ts
if (skill.id === "example-skill") {
  // wrong layer
}
```

## 8. Required coverage

Before merge:

- `npm run skill:validate` passes;
- source commit is pinned;
- invalid input fails before execution;
- the Skill runs through its generic runner;
- returned output passes the declared output schema;
- idempotency/resource/lifecycle semantics remain unchanged;
- judgment-heavy LLM behavior has eval fixtures when appropriate.

Run the full local contract:

```bash
npm ci
npm run skill:validate
npm run typecheck
npm test
npm run evals
npm run build
```

## Definition of done

```text
manifest
→ input schema
→ registry
→ idempotency + concurrency admission
→ LLM or Python runner
→ timeout/cancellation
→ output schema
→ RunStore
→ API
→ schema-generated Workbench
```

must work without teaching Runtime Core the Skill's business domain.
