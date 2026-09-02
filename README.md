<div align="center">

# Lavine Skill Runtime

### Turn reviewed `SKILL.md` workflows into runnable products.

**Contract-first · LLM + Python · provenance-aware · deliberately small**

</div>

---

Lavine Skill Runtime is a small execution layer for turning reviewed Agent Skills into schema-driven web/API products without teaching the Runtime Core their business logic.

> **The boundary is intentional: if a capability is listed here, it runs. If it does not run, it is not part of the contract.**

## Runnable surface

| Skill | Source | Runtime | Execution |
| --- | --- | --- | --- |
| `career-alpha-proof` | `career-alpha/skills/proof/SKILL.md` | LLM | OpenAI-compatible provider or deterministic demo |
| `career-alpha-position` | `career-alpha/skills/position/SKILL.md` | LLM | OpenAI-compatible provider or deterministic demo |
| `buffett-moat-rule-check` | `skill-buffett-moat-screener/SKILL.md` | Python | reviewed repo-local subprocess |

The Buffett integration intentionally covers only the ordinary-company hard-rule evaluation on supplied metrics. It does **not** duplicate the source repository's PandaData ingestion, point-in-time reconstruction, Parquet production, or backtesting pipeline.

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
        ┌─────┴─────┐
        │           │
   LLM Runner   Python Runner
        │           │
    Provider    fixed runner.py
        └─────┬─────┘
              ▼
      validated output
              │
              ▼
           RunStore
              │
              ▼
           Web / API
```

The Core owns lifecycle, validation, idempotency, provenance, timeout and resource limits. Business rules live in Skills; model vendors live in providers; Python code lives behind the Python runner.

## What is enforced

- JSON Schema 2020-12 input/output validation.
- Source repository + path + exact 40-character commit provenance.
- `queued → running → completed | failed | timed_out` lifecycle.
- Atomic idempotency by Skill + client key + canonical input hash.
- Stable typed errors and retryability.
- Input/output byte limits and per-Skill concurrency limits.
- Abort-driven LLM timeout.
- Python subprocess timeout/cancellation, fixed repo-local entrypoint, no shell, environment allowlist, JSON stdin/stdout and bounded stdout.
- Reproducible npm install via committed lockfile and `npm ci`.

## Python security boundary

The Python runner is **not an arbitrary-code sandbox**.

It only runs an entrypoint declared by a reviewed Skill manifest under:

```text
skills/<skill-id>/
```

It does not accept user-provided file paths, commands or source code; it does not invoke a shell; provider/application secrets are not forwarded into the subprocess environment. Python 3 must exist on the host (`PYTHON_BIN` can override the executable).

## Quick start

Requirements:

- Node.js 22
- npm 10
- Python 3 for Python Skills

```bash
npm ci
cp .env.example .env.local
npm run skill:validate
npm test
npm run evals
npm run dev
```

Open `http://localhost:3000`.

LLM provider configuration is optional:

```env
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=gpt-5-mini
LLM_PROVIDER=openai-compatible

# Optional Python executable override
PYTHON_BIN=python3
```

Without an LLM key, reviewed LLM Skills use deterministic demo adapters through the same Runtime pipeline. Python Skills always execute their reviewed local Python entrypoint.

## API v1

```text
GET  /api/v1/health
GET  /api/v1/skills
GET  /api/v1/skills/:id
POST /api/v1/skills/:id/run
GET  /api/v1/runs
GET  /api/v1/runs/:runId
```

Create an idempotent Run:

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

Run the Python Buffett rule check:

```bash
curl -X POST http://localhost:3000/api/v1/skills/buffett-moat-rule-check/run \
  -H "content-type: application/json" \
  -d '{
    "symbol":"600519.SH",
    "roe_latest_pct":30,
    "roe_10y_min_pct":18,
    "gross_margin_latest_pct":90,
    "gross_margin_volatility_pp":3,
    "net_profit_positive":true,
    "capex_to_net_profit_pct":12,
    "debt_to_net_profit_ratio":0.5,
    "pe_ttm":20
  }'
```

## Skill tooling

```bash
npm run skill:list
npm run skill:validate
```

Scaffold only the runtimes implemented today:

```bash
npm run skill:init -- \
  my-skill \
  owner/repository \
  skills/my-skill/SKILL.md \
  0123456789abcdef0123456789abcdef01234567 \
  llm
```

Use `python` as the final argument for a Python Skill. Generated Skills still require review and explicit registration in `skills/registry.ts`.

## CI contract

Every push must pass:

```text
npm ci
skill contract validation
TypeScript typecheck
Runtime tests (LLM + Python)
behavior evals
Next.js production build
production dependency audit
```

## Deliberate non-goals

This repository currently does **not** provide:

- arbitrary third-party Skill uploads or arbitrary code execution;
- marketplace, billing, accounts or creator settlement;
- persistent/distributed Run storage;
- queue/workers or background jobs;
- image/browser runners;
- artifact/object storage;
- Docker/container sandboxing;
- the full PandaData Buffett screener pipeline.

Those are not "missing checkboxes" for this boundary. They should only be added when a concrete product requirement justifies them.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/ADDING_A_SKILL.md`](docs/ADDING_A_SKILL.md)
- [`docs/API.md`](docs/API.md)
- [`docs/RUNTIME_CONTRACT.md`](docs/RUNTIME_CONTRACT.md)
- [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md)
- [`SECURITY.md`](SECURITY.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)

---

**Done means:** a reviewed LLM Skill and a reviewed Python Skill both execute through the same manifest → schema → registry → runtime → validated Run contract, from API and the schema-generated Workbench, with CI green.
