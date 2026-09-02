# Changelog

All notable changes to Lavine Skill Runtime are tracked here.

## Unreleased — Runnable Boundary

### Added

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
