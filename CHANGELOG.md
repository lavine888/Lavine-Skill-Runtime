# Changelog

All notable changes to Lavine Skill Runtime are tracked here.

## 0.4.0 — Runnable Boundary (2026-09-23)

### Added

- Persisted `error_http_status` on failed Runs so provider failures keep typed HTTP semantics (`502`/`503`/`504`) instead of collapsing to `500`.
- Demo execution gate: deterministic demo output is denied in production unless `LLM_ALLOW_DEMO=1`; `/api/v1/health` now reports `llm_provider: configured | demo | unconfigured`.
- Structured single-line lifecycle event logging (`run.created`, `run.completed`, `run.failed`, `run.replayed`, bounded Python stderr diagnostics) with `LOG_EVENTS=off` opt-out.
- Bounded MemoryRunStore: `RUN_STORE_MAX_RUNS` cap with oldest-run eviction, plus an O(1) `(skill_id, idempotency_key)` index.
- Run route pre-flight validation: unknown Skill returns typed `404`, oversized `Content-Length` returns `413` before body parsing, malformed JSON returns `400`.
- Python runner resolves the skills directory relative to the runtime module with an optional `SKILLS_DIR` override for standalone/container deployments.
- Regression coverage for provider HTTP status persistence, production demo fail-closed behavior, and store eviction/idempotency indexing.

### Changed

- Compiled Ajv validators are cached per schema instead of recompiled on every input/output validation.
- Python subprocess stderr stays in server-side logs; client-facing `EXECUTION_FAILED` messages no longer echo stderr content.
- API 404 responses use the standard `{ error: { code, message, retryable } }` envelope (`UNKNOWN_SKILL`, `UNKNOWN_RUN`).
- `engines` widened to `>=22` (Node 23/24 no longer rejected).

### Added (previous)

- Reviewed Python subprocess runner with fixed repo-local entrypoints, `shell: false`, environment allowlist, JSON stdin/stdout, bounded output, and AbortSignal cancellation.
- `buffett-moat-rule-check`, a deterministic Python integration of the source Buffett Skill's ordinary-company hard rules on supplied metrics.
- Typed Workbench support for string, number, integer, boolean, and scalar enum inputs.
- `/api/v1/health` liveness endpoint.
- Architecture documentation covering layer ownership, atomic idempotency, timeout cancellation, Python trust boundaries, and completion criteria.
- Concurrent idempotency regression coverage.
- Runtime tests proving both LLM and Python execution paths.

### Changed

- MemoryRunStore `create()` owns atomic idempotent creation semantics inside one JavaScript process.
- OpenAI-compatible requests receive Runtime `AbortSignal` through SDK request options.
- Manifest v1 now describes only implemented runtime types: `llm` and `python`.
- Skill scaffolding now generates runnable LLM or Python package shapes only.
- Documentation is converged around the current runnable boundary instead of speculative roadmap features.

### Removed

- Unimplemented `image` runtime from the public Manifest/type surface.
- Unimplemented `cancelled` Run state.
- Unenforced artifact declarations and artifact-count limits.

## 0.3.1

### Added

- Stable Runtime error taxonomy with retryability semantics.
- `Idempotency-Key` support and canonical SHA-256 input hashes.
- Manifest-level input/output/concurrency resource limits.
- In-process per-Skill concurrency enforcement.
- Provider failure normalization for auth, rate-limit, timeout, and generic failures.
- Behavior eval fixtures for Career Alpha integrity baselines.
- Runtime Contract and Security Model documentation.
- Workbench display for structured errors.

### Changed

- Direct dependency versions are pinned exactly.
- Runtime API distinguishes pre-run contract errors from created Run failures.
- Manifest v1 requires explicit bounded resource policy.

## 0.3.0

- Split Runtime Core, runner registry, LLM runner, provider abstraction, and RunStore.
- Added Manifest JSON Schema and source commit provenance.
- Added Skill CLI for list, validate, and init workflows.
- Added OpenAI-compatible provider configuration.

## 0.2.0

- Added a second Career Alpha Skill to prove multi-Skill extensibility.
- Made the Workbench schema-driven for inputs and structured outputs.

## 0.1.0

- Initial runnable MVP with manifest, schema validation, Run lifecycle, API, Workbench, and Career Proof Audit.
