# Adding a Skill

A Skill should extend the catalog without adding business-specific branches to Runtime Core.

## 1. Start from the CLI

For a reviewed upstream Skill, scaffold the contract with an immutable source commit:

```bash
npm run skill:init -- \
  example-skill \
  owner/source-repo \
  skills/example/SKILL.md \
  0123456789abcdef0123456789abcdef01234567 \
  llm
```

Then validate the catalog:

```bash
npm run skill:validate
npm run skill:list
```

The generated files are a scaffold, not an approval. Review schemas, behavior, provenance, runtime limits, and the adapter before registration.

## 2. Skill package

```text
skills/<skill-id>/
├── manifest.json
├── input.schema.json
├── output.schema.json
├── prompt.ts        # LLM Skills
└── adapter.ts
```

## 3. Manifest rules

The canonical contract is `runtime/manifest.schema.json`.

```json
{
  "schema_version": "1.0",
  "id": "example-skill",
  "name": "Example Skill",
  "description": "What outcome this Skill produces.",
  "version": "0.1.0",
  "source": {
    "repo": "owner/source-repo",
    "path": "skills/example/SKILL.md",
    "ref": "main",
    "commit": "0123456789abcdef0123456789abcdef01234567"
  },
  "runtime": {
    "type": "llm",
    "adapter": "example-skill"
  },
  "input_schema": "./input.schema.json",
  "output_schema": "./output.schema.json",
  "artifacts": ["json"],
  "limits": {
    "timeout_seconds": 120,
    "max_input_bytes": 262144,
    "max_output_bytes": 1048576,
    "max_concurrency": 2,
    "max_artifacts": 8
  }
}
```

Required invariants:

- `manifest.id` is kebab-case and globally unique;
- source `commit` is a full immutable 40-character SHA;
- `manifest.runtime.adapter` equals `adapter.id`;
- `manifest.runtime.type` equals `adapter.runtime`;
- inputs and outputs compile as JSON Schema 2020-12;
- resource limits are explicit and bounded;
- unsupported runtime types fail closed until a Runner is registered;
- SKILL.md is reviewed instruction/data, never arbitrary executable shell code.

Unknown Manifest major versions must fail closed.

## 4. Runtime contracts

Manifest v1 recognizes:

### LLM

```json
{ "type": "llm", "adapter": "example-skill" }
```

Supported today.

### Python

```json
{
  "type": "python",
  "adapter": "example-python-skill",
  "entrypoint": "runner.py"
}
```

Protocol-ready, but no Python Runner is registered yet. Do not register it as runnable until the runner enforces the security model.

### Image

```json
{ "type": "image", "adapter": "example-image-skill" }
```

Protocol-ready, but no Image Runner is registered yet.

## 5. Input schema

Prefer small explicit contracts. Titles/descriptions matter because Workbench forms are schema-generated.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["goal"],
  "properties": {
    "goal": {
      "type": "string",
      "minLength": 2,
      "title": "Goal"
    }
  }
}
```

## 6. Output schema

Outputs are product contracts, not chat transcripts. Prefer stable keys, bounded arrays, explicit enums, and `additionalProperties: false` on structured objects.

Large files should become Artifacts once ArtifactStore lands instead of being embedded in JSON.

## 7. LLM adapter

An adapter owns Skill-specific behavior. Runner owns execution mechanics. Provider owns vendor access.

```ts
export const exampleAdapter: SkillAdapter = {
  id: "example-skill",
  runtime: "llm",
  responseSchemaName: "example_result",
  buildMessages(input) {
    return {
      system: "Reviewed system contract...",
      user: `Goal: ${String(input.goal || "")}`,
    };
  },
  demo(input) {
    return { result: String(input.goal || "") };
  },
};
```

Never add business dispatch to Core:

```ts
if (skill.id === "example-skill") {
  // design failure
}
```

## 8. Register the Skill

Add the reviewed `SkillDefinition` to `skills/registry.ts`.

Editing the catalog is expected. Editing Runtime Core to understand the new business domain is not.

## 9. Contract and behavior coverage

At minimum verify:

- `npm run skill:validate` passes;
- the Skill appears in `listSkills()`;
- source provenance is pinned;
- invalid input is rejected before execution;
- resource policy is declared;
- deterministic demo execution completes;
- demo output passes the same output schema as provider-backed execution;
- unsupported runners are never silently substituted;
- high-risk semantic invariants have eval fixtures when applicable.

For judgment-heavy Skills, add fixtures under `evals/` and run:

```bash
npm run evals
```

Schema-valid output is not automatically behaviorally correct.

## 10. Operational semantics

New Skills inherit the shared Runtime contract for:

- idempotency;
- typed errors and retryability;
- timeout/status semantics;
- resource limits;
- provenance;
- logging/privacy boundaries.

See `docs/RUNTIME_CONTRACT.md` and `docs/SECURITY_MODEL.md`.

## Definition of done

```text
manifest validation
→ source provenance
→ input validation + input limits
→ registry
→ idempotency
→ concurrency admission
→ runner dispatch
→ provider / execution
→ timeout policy
→ output validation + output limits
→ RunStore
→ API
→ schema-generated web form
→ generic result renderer
→ behavior evals where needed
```

must work without introducing business-specific logic into Runtime Core.
