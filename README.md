<div align="center">

# Lavine Skill Runtime

### Turn `SKILL.md` into runnable products.

**One runtime · schema-driven inputs · reviewed adapters · validated outputs**

</div>

---

Lavine Skill Runtime is a small execution layer for turning reviewed Agent Skills into web/API products without teaching the runtime their business logic.

The design goal is simple:

> **Adding the next Skill should extend the catalog, not rewrite the Runtime Core.**

## v0.2 status

Two Career Alpha skills now run through the same core:

| Skill | Source | Runtime | Status |
| --- | --- | --- | --- |
| `career-alpha-proof` | `career-alpha/skills/proof/SKILL.md` | LLM | Runnable |
| `career-alpha-position` | `career-alpha/skills/position/SKILL.md` | LLM | Runnable |

The web workbench is schema-driven: it reads each Skill's input schema to generate the form and renders arbitrary schema-validated JSON output without a skill-specific page.

## Execution flow

```text
SKILL.md / reviewed workflow
        ↓
manifest.json
        ↓
input.schema.json
        ↓
Skill Adapter
        ↓
Skill Registry
        ↓
Runtime Core
        ↓
Runner (LLM today)
        ↓
output.schema.json
        ↓
Run Record
        ↓
Web UI / API
```

## What the core knows

The Runtime Core knows how to:

- discover registered Skill definitions;
- validate input with JSON Schema 2020-12;
- create a run and track `queued → running → completed | failed`;
- dispatch to a reviewed runner/adapter;
- validate the returned output;
- expose the run through API and UI.

It does **not** know what career evidence, resume positioning, quant factors, or illustration styles mean.

## Skill contract

Each hosted Skill owns its business logic:

```text
skills/<skill-id>/
├── manifest.json
├── input.schema.json
├── output.schema.json
├── prompt.ts
└── adapter.ts
```

`skills/registry.ts` is the catalog boundary. Runtime Core imports the catalog, not individual Skill implementations.

## Stack

- Next.js + React + TypeScript
- JSON Schema 2020-12 + Ajv
- OpenAI SDK
- In-memory run store for v0.x
- Vitest
- GitHub Actions: typecheck + tests + production build

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` for model-backed execution. Without a key, each reviewed Skill can provide a deterministic demo adapter so the same manifest/schema/run pipeline remains testable.

Open `http://localhost:3000`.

## API

```text
GET  /api/skills
GET  /api/skills/:id
POST /api/skills/:id/run
GET  /api/runs/:runId
```

Example — Career Proof:

```bash
curl -X POST http://localhost:3000/api/skills/career-alpha-proof/run \
  -H "content-type: application/json" \
  -d '{
    "target_role":"AI Product Manager",
    "resume":"Built an AI agent product and coordinated delivery.",
    "evidence":"GitHub repo, demo deployment, benchmark notes"
  }'
```

Example — Career Positioning:

```bash
curl -X POST http://localhost:3000/api/skills/career-alpha-position/run \
  -H "content-type: application/json" \
  -d '{
    "target_role":"Agent Engineer",
    "current_material":"Built an agent workflow, documented failure cases, coordinated integration, and published a working repository with tests.",
    "channel":"resume"
  }'
```

## Current boundaries

v0.2 intentionally does **not** include:

- marketplace / creator uploads;
- billing or credits;
- arbitrary third-party code execution;
- queues or background workers;
- Python runner;
- image runner;
- Docker sandbox;
- persistent Postgres run history;
- artifact object storage.

Those become useful only after the Skill contract and multi-Skill runtime are proven.

## Next milestones

### v0.3 — Skill SDK / contract tooling

- manifest validation;
- `skill init` template;
- registry consistency checks;
- contract tests per Skill.

### v0.4 — Python Runner

Use the same Runtime Core to host code-backed Skills such as Buffett Moat Screener and Mean Reversal.

### v0.5 — Artifacts

Persist Markdown, JSON, CSV, Parquet, PNG and ZIP outputs outside the run record.

---

**Core invariant:** a new business domain should be added as a Skill definition + adapter, not as a special case inside Runtime Core.
