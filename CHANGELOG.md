# Changelog

All notable changes to Lavine Skill Runtime are tracked here.

## Unreleased

### Added

- Abort-aware Runner context so Runtime timeout can propagate cancellation into supported providers.
- `/api/v1/health` liveness endpoint.
- Architecture documentation covering layer ownership, atomic idempotency, timeout cancellation, persistence invariants, and future Python isolation boundaries.
- Concurrent idempotency regression coverage.

### Changed

- MemoryRunStore `create()` now owns atomic idempotent creation semantics inside one JavaScript process.
- OpenAI-compatible requests receive Runtime `AbortSignal` through SDK request options.
- Contribution guidance now requires `npm ci`, behavior evals, and explicit concurrency/cancellation review for Runtime changes.

## 0.3.1

### Added

- Stable Runtime error taxonomy with retryability semantics.
- `Idempotency-Key` support and canonical SHA-256 input hashes.
- Manifest-level input/output/concurrency/artifact resource limits.
- In-process per-Skill concurrency enforcement.
- Provider failure normalization for auth, rate-limit, timeout, and generic failures.
- Behavior eval fixtures for Career Alpha integrity baselines.
- Runtime Contract and Security Model documentation.
- Workbench display for structured errors.

### Changed

- Direct dependency versions are pinned exactly.
- Runtime API distinguishes pre-run contract errors from created Run failures.
- Manifest v1 now requires explicit bounded resource policy.

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
