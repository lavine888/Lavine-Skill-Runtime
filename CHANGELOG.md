# Changelog

All notable changes to Lavine Skill Runtime are tracked here.

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
