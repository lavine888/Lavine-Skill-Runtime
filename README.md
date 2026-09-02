<div align="center">

# Lavine Skill Runtime

### Turn `SKILL.md` into runnable products.

**Contract-first · runner-based · provider-neutral · provenance-aware**

</div>

---

Lavine Skill Runtime turns reviewed Agent Skills into schema-driven web/API products without teaching the Runtime Core their business logic.

> **Adding the next Skill should extend the catalog, not rewrite the Runtime Core.**

## v0.3.1 status

Two Career Alpha Skills currently run through the same LLM runner:

| Skill | Source | Runtime | Status |
| --- | --- | --- | --- |
| `career-alpha-proof` | `career-alpha/skills/proof/SKILL.md` | LLM | Runnable |
| `career-alpha-position` | `career-alpha/skills/position/SKILL.md` | LLM | Runnable |

v0.3.1 hardens the runtime around operational semantics that future Python/Image runners can reuse:

- **Manifest contract** — JSON Schema 2020-12, immutable source commit, explicit resource policy.
- **Runner abstraction** — only registered runtime types can execute; unsupported types fail closed.
- **Provider abstraction** — OpenAI-compatible LLM execution is isolated from Core.
- **RunStore abstraction** — persistence is replaceable without changing execution logic.
- **Idempotency** — same Skill + key + input replays the original Run; conflicting reuse fails.
- **Typed errors** — stable error codes plus retryability instead of one generic failure bucket.
- **Resource limits** — timeout, input/output bytes, concurrency, and artifact-count policy.
- **Behavior evals** — Skill integrity assertions live beside code tests.
- **Reproducible install** — exact direct versions, committed npm lockfile, Node/npm contract, and CI via `npm ci`.

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
        ┌─────┴──────────────┐
        │                    │
     LLM Runner       future Python/Image
        │
        ▼
 OpenAI-compatible Provider
        │
        ▼
 schema + size validation
        │
        ▼
          RunStore
        │
        ▼
       Web / API
```

Core coordinates contracts and lifecycle. It does not contain Career Alpha business logic or vendor-specific model calls.

## Run lifecycle

```text
queued
  ↓
running
  ├──► completed
  ├──► failed
  └──► timed_out
```

`cancelled` is already reserved in the contract for the future worker/queue layer.

A Run records Skill/version/provenance, SHA-256 `input_hash`, optional `idempotency_key`, runner/provider/model, timestamps/duration, typed errors, retryability, and validated output.

## Idempotent runs

```bash
curl -X POST http://localhost:3000/api/v1/skills/career-alpha-proof/run \
  -H "content-type: application/json" \
  -H "idempotency-key: proof-demo-001" \
  -d '{
    "target_role":"AI Product Manager",
    "resume":"Built an AI agent product and coordinated delivery.",
    "evidence":"GitHub repo, demo deployment, benchmark notes"
  }'
```

Reusing `proof-demo-001` with the same canonical input returns the original Run. Reusing it with different input returns `IDEMPOTENCY_CONFLICT`.

## Error contract

Examples:

```text
INPUT_INVALID
INPUT_TOO_LARGE
IDEMPOTENCY_CONFLICT
CONCURRENCY_LIMIT
RUNNER_UNAVAILABLE
PROVIDER_AUTH_FAILED
PROVIDER_RATE_LIMITED
PROVIDER_TIMEOUT
OUTPUT_INVALID
EXECUTION_TIMEOUT
EXECUTION_FAILED
```

Clients should use `error_code` and `retryable` rather than parsing message strings. See [`docs/RUNTIME_CONTRACT.md`](docs/RUNTIME_CONTRACT.md).

## Resource policy

Each Skill manifest declares:

```json
{
  "limits": {
    "timeout_seconds": 120,
    "max_input_bytes": 262144,
    "max_output_bytes": 1048576,
    "max_concurrency": 4,
    "max_artifacts": 4
  }
}
```

Payload size, timeout, and in-process concurrency are enforced today. `max_artifacts` is part of the contract ahead of ArtifactStore/Python/Image support.

## Skill CLI

```bash
npm run skill:list
npm run skill:validate
```

Scaffold a reviewed Skill contract:

```bash
npm run skill:init -- \
  my-skill \
  owner/repository \
  skills/my-skill/SKILL.md \
  0123456789abcdef0123456789abcdef01234567 \
  llm
```

Generated contracts still require human review and explicit registration in `skills/registry.ts`.

## Behavior evals

```bash
npm run evals
```

Current integrity baselines include unsupported claims staying `SELF-REPORTED`, evidence not automatically becoming `VERIFIED`, and future positioning staying separate from present-tense claims.

## Provider configuration

```env
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=gpt-5-mini
LLM_PROVIDER=openai-compatible
```

`OPENAI_API_KEY` and `OPENAI_MODEL` remain backward-compatible aliases. Without a provider key, reviewed LLM Skills use deterministic demo adapters through the same Runtime pipeline.

## Quick start

```bash
npm ci
cp .env.example .env.local
npm run skill:validate
npm test
npm run evals
npm run dev
```

Open `http://localhost:3000`.

## API

Prefer the versioned surface:

```text
GET  /api/v1/skills
GET  /api/v1/skills/:id
POST /api/v1/skills/:id/run
GET  /api/v1/runs
GET  /api/v1/runs/:runId
```

Legacy `/api/...` routes remain compatibility aliases during v0.x. See [`docs/API.md`](docs/API.md).

## Security and privacy

Runtime treats user input/provider output as untrusted and does not claim safe arbitrary-code execution. Full user payloads must not be written to logs by default. When a model provider is configured, relevant Skill input is sent to that provider.

Read:

- [`SECURITY.md`](SECURITY.md)
- [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md)
- [`docs/RUNTIME_CONTRACT.md`](docs/RUNTIME_CONTRACT.md)

## CI contract

Every push must pass:

```text
npm ci from committed lockfile
Skill manifest/schema validation
TypeScript typecheck
Runtime tests
Behavior evals
Next.js production build
Production dependency security audit
```

## Current boundaries

v0.3.1 intentionally does **not** include marketplace uploads, billing, arbitrary third-party code execution, persistent Postgres, a distributed queue/worker, Python/Image runners, Docker sandboxing, or artifact object storage.

## Next milestones

### v0.4 — Python Runner

Run a reviewed deterministic code-backed Skill through the same Manifest, idempotency, resource, error, RunStore, and provenance contracts. First target: Buffett Moat Screener.

### v0.5 — Artifact Store

Add checksummed JSON/CSV/Parquet/Markdown/PNG/ZIP artifacts behind an `ArtifactStore` interface.

### v0.6 — Persistent Runs + observability

Add PostgreSQL RunStore, retention policy, structured operational logs, token/cost metadata, and metrics without logging raw user payloads.

---

**Core invariant:** business domains belong in Skill definitions and adapters; execution environments belong in runners; vendors belong in providers; persistence belongs in stores.
