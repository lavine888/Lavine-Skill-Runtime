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

The generated files are a scaffold, not an approval. Review the schemas, adapter behavior, and source revision before registration.

## 2. Skill package

```text
skills/<skill-id>/
├── manifest.json
├── input.schema.json
├── output.schema.json
├── prompt.ts        # LLM skills
└── adapter.ts
```

## 3. Manifest rules

The manifest defines identity, source provenance, and execution policy.

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
    "timeout_seconds": 120
  }
}
```

The canonical manifest contract is `runtime/manifest.schema.json`.

Required invariants:

- `manifest.id` is kebab-case and globally unique;
- source `commit` is a full immutable 40-character SHA;
- `manifest.runtime.adapter` equals `adapter.id`;
- `manifest.runtime.type` equals `adapter.runtime`;
- inputs and outputs compile as JSON Schema 2020-12;
- `timeout_seconds` is enforced by Runtime Core;
- unsupported runtime types fail closed until a Runner is registered;
- SKILL.md is reviewed instruction/data, never arbitrary executable shell code.

## 4. Runtime contracts

Manifest v1 recognizes three runtime types:

### LLM

```json
{
  "type": "llm",
  "adapter": "example-skill"
}
```

Supported in v0.3.

### Python

```json
{
  "type": "python",
  "adapter": "example-python-skill",
  "entrypoint": "runner.py"
}
```

The contract is schema-ready, but v0.3 intentionally has no Python Runner. Such a Skill must not be registered as runnable yet.

### Image

```json
{
  "type": "image",
  "adapter": "example-image-skill"
}
```

The contract is schema-ready, but no Image Runner is registered yet.

## 5. Input schema

Prefer small, explicit contracts. Titles and descriptions matter because the web workbench generates forms from the schema.

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

Outputs are product contracts, not chat transcripts.

Prefer stable object keys, bounded arrays, explicit status enums, `additionalProperties: false`, and artifacts for large files once ArtifactStore lands.

## 7. LLM adapter

An adapter owns Skill-specific behavior. The Runner owns execution mechanics and the Provider owns vendor access.

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

Do not add this to Core:

```ts
if (skill.id === "example-skill") {
  // business logic
}
```

## 8. Register the Skill

Add the reviewed `SkillDefinition` to `skills/registry.ts`.

This is the catalog boundary. Editing the catalog is expected; editing Runtime Core for a business domain is a design failure.

## 9. Contract coverage

At minimum verify:

- `npm run skill:validate` passes;
- the Skill appears in `listSkills()`;
- source provenance is pinned;
- invalid input is rejected before execution;
- deterministic demo execution completes;
- demo output passes the same output schema as provider-backed execution;
- no unsupported Runner is silently substituted.

## Definition of done

```text
manifest validation
→ source provenance
→ input validation
→ registry
→ runner dispatch
→ provider / execution
→ timeout policy
→ output validation
→ RunStore
→ API
→ schema-generated web form
→ generic result renderer
```

must work without introducing business-specific logic into Runtime Core.
