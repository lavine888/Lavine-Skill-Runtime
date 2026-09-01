# Adding a Skill

A Skill should extend the catalog without adding business-specific branches to `runtime/index.ts`.

## 1. Create a Skill package

```text
skills/<skill-id>/
├── manifest.json
├── input.schema.json
├── output.schema.json
├── prompt.ts
└── adapter.ts
```

## 2. Manifest rules

The manifest defines identity and execution policy.

```json
{
  "schema_version": "1.0",
  "id": "example-skill",
  "name": "Example Skill",
  "description": "What outcome this Skill produces.",
  "version": "0.1.0",
  "source": {
    "repo": "owner/source-repo",
    "path": "skills/example/SKILL.md"
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

Required invariants:

- `manifest.id` must be globally unique;
- `manifest.runtime.adapter` must equal `adapter.id`;
- inputs and outputs must pass JSON Schema 2020-12 validation;
- `timeout_seconds` is enforced by Runtime Core;
- SKILL.md is treated as reviewed instruction/data, not arbitrary executable code.

## 3. Input schema

Prefer small, explicit contracts. Use titles and descriptions because the web workbench generates its form from this schema.

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

## 4. Output schema

Outputs should be product contracts, not free-form chat transcripts.

Prefer:

- stable object keys;
- bounded arrays;
- explicit enums for statuses;
- `additionalProperties: false` on structured objects;
- artifacts for large files rather than embedding them in JSON once artifact storage exists.

## 5. Adapter

An adapter owns Skill-specific behavior.

```ts
export const exampleAdapter: SkillAdapter = {
  id: "example-skill",
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

Runtime Core must not contain conditionals such as:

```ts
if (skill.id === "example-skill") {
  // business logic
}
```

## 6. Register the Skill

Add the Skill definition to `skills/registry.ts`.

This file is the catalog boundary. Editing the catalog is expected; editing Runtime Core is not.

## 7. Add contract coverage

At minimum test:

- the Skill appears in `listSkills()`;
- invalid input is rejected before execution;
- deterministic demo execution completes;
- demo output passes the same output schema as model-backed execution.

## Definition of done

A Skill is integrated when:

```text
manifest
→ input validation
→ adapter dispatch
→ timeout policy
→ output validation
→ run record
→ API
→ schema-generated web form
→ generic result renderer
```

all work without introducing business-specific logic into Runtime Core.
