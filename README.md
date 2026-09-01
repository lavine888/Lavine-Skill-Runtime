# Lavine Skill Runtime

> Turn `SKILL.md` into runnable products.

Lavine Skill Runtime is a small execution layer for turning reviewed Agent Skills into schema-driven web/API products.

## MVP scope

The first MVP supports one skill: **Career Alpha /proof**.

Flow:

```text
manifest
  -> registry
  -> input schema validation
  -> LLM runner
  -> output schema validation
  -> run result
  -> web UI / API
```

This repository intentionally does **not** include a marketplace, billing, arbitrary third-party code execution, queues, Docker sandboxes, or creator payouts yet.

## Stack

- Next.js + React + TypeScript
- JSON Schema + Ajv
- OpenAI SDK
- In-memory run store for MVP
- Vitest

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` for live execution. If no API key is provided, the MVP falls back to a deterministic demo runner so the full runtime flow can still be tested.

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

## MVP architecture

```text
apps/web
  |
  v
API routes
  |
  v
runtime/core
  |- registry
  |- schema validation
  |- run lifecycle
  `- runner dispatch
       |
       `- LLM runner
            |
            `- Career Alpha /proof adapter
```

## Skill contract

Each hosted skill has:

```text
manifest.json
input.schema.json
output.schema.json
adapter.ts
```

The runtime core does not know career, quant, or illustration business logic. It only knows how to load a manifest, validate input, select a runner, validate output, and record a run.

## Definition of done for v0.1

A second LLM skill should be addable without changing runtime-core behavior.
