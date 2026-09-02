# Runtime Contract

This document defines the operational semantics shared by every hosted Skill.

## Run lifecycle

A Run moves through:

```text
queued -> running -> completed
                 -> failed
                 -> timed_out
                 -> cancelled
```

`failed` means execution ended with a classified error. `timed_out` is reserved for Runtime-enforced execution timeout. `cancelled` is reserved for explicit cancellation support and is not yet exposed by the public API.

## Idempotency

Clients may send an `Idempotency-Key` header when creating a Run.

- Same Skill + same key + same canonical input returns the original Run.
- Same Skill + same key + different input fails with `IDEMPOTENCY_CONFLICT`.
- Keys are bounded to 128 characters.
- Input identity is represented by a SHA-256 `input_hash` over canonical JSON.

Idempotency is scoped to a Skill in v0.x. Persistent stores must preserve the same uniqueness rule.

## Error taxonomy

Runtime and provider failures use stable codes:

- `UNKNOWN_SKILL`
- `INPUT_INVALID`
- `INPUT_TOO_LARGE`
- `OUTPUT_INVALID`
- `OUTPUT_TOO_LARGE`
- `IDEMPOTENCY_CONFLICT`
- `CONCURRENCY_LIMIT`
- `RUNNER_UNAVAILABLE`
- `PROVIDER_AUTH_FAILED`
- `PROVIDER_RATE_LIMITED`
- `PROVIDER_TIMEOUT`
- `PROVIDER_FAILED`
- `EXECUTION_TIMEOUT`
- `EXECUTION_FAILED`
- `INTERNAL_ERROR`

Each error also has a `retryable` signal. Clients should not infer retry behavior only from HTTP status.

## Resource policy

Every Manifest v1 Skill declares:

- `timeout_seconds`
- `max_input_bytes`
- `max_output_bytes`
- `max_concurrency`
- `max_artifacts`

Runtime Core enforces payload sizes, timeout, and in-process per-Skill concurrency today. `max_artifacts` is part of the contract now so the future Artifact Store and Python/Image runners can enforce it without changing the manifest protocol.

## Source provenance

Every registered Skill pins:

- source repository
- source path
- human-readable ref
- immutable 40-character commit SHA

A Run copies that source reference into its record. Updating a Skill source requires updating the registered Manifest version/provenance explicitly.

## Manifest compatibility

Runtime v0.x supports Manifest schema major version `1` only. Unknown major versions must fail closed rather than being interpreted heuristically.

Backward-compatible additions should remain within the same major version only when older runtimes can safely ignore or default them. Breaking execution semantics require a new manifest major version.

## Persistence contract

`RunStore` owns persistence. Runtime Core must not depend on a database implementation.

The current `MemoryRunStore` is development-only. A production store must preserve:

- Run ID uniqueness
- idempotency semantics
- state transitions
- source provenance
- typed errors
- timestamps and duration

## Logging contract

Do not log full user inputs, full outputs, provider credentials, or raw authorization headers by default. Operational logs should prefer Run IDs, Skill IDs, status, duration, provider/model identifiers, byte counts, and error codes.
