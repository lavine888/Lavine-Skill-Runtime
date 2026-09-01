<div align="center">

# Lavine Skill Runtime

### Turn `SKILL.md` into runnable products.

**Contract-first · runner-based · provider-neutral · provenance-aware**

</div>

---

Lavine Skill Runtime turns reviewed Agent Skills into schema-driven web/API products without teaching the Runtime Core their business logic.

> **Adding the next Skill should extend the catalog, not rewrite the Runtime Core.**

## v0.3 status

Two Career Alpha skills run through the same LLM runner:

| Skill | Source | Runtime | Status |
| --- | --- | --- | --- |
| `career-alpha-proof` | `career-alpha/skills/proof/SKILL.md` | LLM | Runnable |
| `career-alpha-position` | `career-alpha/skills/position/SKILL.md` | LLM | Runnable |

v0.3 hardens the runtime around six boundaries:

- **Manifest contract** — every Skill manifest is validated against JSON Schema 2020-12.
- **Runner abstraction** — Core dispatches by runtime type; only registered runners can execute.
- **Provider abstraction** — LLM execution is isolated behind an OpenAI-compatible provider adapter.
- **RunStore abstraction** — in-memory storage is replaceable without changing execution logic.
- **Source provenance** — every registered Skill pins an upstream ref and immutable commit SHA.
- **Skill tooling** — CLI commands list, validate, and scaffold Skill contracts.

## Architecture

```text
Reviewed SKILL.md
      │
      ▼
manifest.json ──► Manifest Schema
      │
      ├── input.schema.json
      ├── output.schema.json
      └── adapter.ts
              │
              ▼
        Skill Registry
              │
              ▼
        Runtime Core
              │
              ▼
        Runner Registry
              │
        ┌─────┴─────┐
        │           │
     LLM Runner   future Python/Image runners
        │
        ▼
 OpenAI-compatible Provider
        │
        ▼
 validated output
        │
        ▼
          RunStore
        │
        ▼
       Web / API
```

The Runtime Core does not import OpenAI, Career Alpha prompts, or individual Skill implementations. It validates, dispatches, tracks lifecycle, and persists through interfaces.

## Run lifecycle

```text
queued
  ↓
running
  ├──► completed
  ├──► failed
  └──► timed_out
```

`cancelled` is reserved in the status contract for the future worker/queue layer.

A run records:

- Skill ID and version;
- pinned source repository, ref, path, and commit;
- runner, provider, and model;
- timestamps and duration;
- input/output;
- error code and failure state.

## Skill contract

```text
skills/<skill-id>/
├── manifest.json
├── input.schema.json
├── output.schema.json
├── prompt.ts        # LLM skills
└── adapter.ts
```

The v1 manifest supports runtime contracts for:

```text
llm
python  # schema-ready, runner not registered yet
image   # schema-ready, runner not registered yet
```

Unsupported runtime types fail closed until their runner is explicitly registered.

## Skill CLI

List contracts:

```bash
npm run skill:list
```

Validate every manifest and JSON Schema:

```bash
npm run skill:validate
```

Scaffold a new Skill contract:

```bash
npm run skill:init -- \
  my-skill \
  owner/repository \
  skills/my-skill/SKILL.md \
  0123456789abcdef0123456789abcdef01234567 \
  llm
```

The generated contract still requires review and registration in `skills/registry.ts`.

## Provider configuration

The preferred configuration is provider-neutral and works with OpenAI-compatible endpoints:

```env
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=gpt-5-mini
LLM_PROVIDER=openai-compatible
```

`OPENAI_API_KEY` and `OPENAI_MODEL` remain backward-compatible aliases.

Without a provider key, reviewed LLM Skills use deterministic demo adapters while still passing through the same manifest → registry → runner → RunStore → output-validation path.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run skill:validate
npm test
npm run dev
```

Open `http://localhost:3000`.

## API

```text
GET  /api/skills
GET  /api/skills/:id
POST /api/skills/:id/run
GET  /api/runs/:runId
```

Example:

```bash
curl -X POST http://localhost:3000/api/skills/career-alpha-proof/run \
  -H "content-type: application/json" \
  -d '{
    "target_role":"AI Product Manager",
    "resume":"Built an AI agent product and coordinated delivery.",
    "evidence":"GitHub repo, demo deployment, benchmark notes"
  }'
```

## CI contract

Every push must pass:

```text
Skill manifest/schema validation
TypeScript typecheck
Runtime tests
Next.js production build
Production dependency security audit
```

## Current boundaries

v0.3 intentionally does **not** include:

- marketplace or arbitrary creator uploads;
- billing / credits;
- arbitrary third-party code execution;
- persistent Postgres RunStore;
- queue / worker orchestration;
- Python runner;
- image runner;
- Docker sandbox;
- artifact object storage.

## Next milestones

### v0.4 — Python Runner

Run code-backed Skills through the same Core. The first target is a reviewed, deterministic Quant Skill such as Buffett Moat Screener.

### v0.5 — Artifact Store

Move file outputs such as JSON, CSV, Parquet, Markdown, PNG and ZIP behind an `ArtifactStore` interface.

### v0.6 — Persistent Runs + observability

Add PostgreSQL-backed RunStore, run history, token/cost metadata, structured errors, and operational metrics.

---

**Core invariant:** business domains belong in Skill definitions and adapters; execution environments belong in runners; vendors belong in providers; persistence belongs in stores.
