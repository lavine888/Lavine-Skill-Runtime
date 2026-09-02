# Runtime Contract

This document defines the operational semantics shared by every hosted Skill in the current runnable boundary.

## Run lifecycle

A Run moves through exactly:

```text
queued -> running -> completed
                 -> failed
                 -> timed_out
```

- `completed`: execution returned schema-valid output.
- `failed`: execution ended with a classified non-timeout error.
- `timed_out`: Runtime timeout fired and cancellation was signalled to the backend.

No queue/cancellation state is part of the current public contract.

## Idempotency

Clients may send `Idempotency-Key` when creating a Run.

- Same Skill + same key + same canonical input returns the original Run.
- Same Skill + same key + different input fails with `IDEMPOTENCY_CONFLICT`.
- Keys are limited to 128 characters.
- Input identity is SHA-256 over canonical JSON.
- Creation must be atomic inside the RunStore implementation.

## Error taxonomy

Stable Runtime codes:

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

Each error also carries `retryable`. Clients should not derive retry policy from message strings.

## Resource policy

Every Manifest v1 Skill declares only limits enforced today:

```text
timeout_seconds
max_input_bytes
max_output_bytes
max_concurrency
```

Runtime validates JSON byte sizes before/after execution and applies in-process per-Skill concurrency admission.

## Runtime types

Manifest v1 supports exactly:

```text
llm
python
```

### LLM

The LLM runner either uses a configured OpenAI-compatible provider or the Skill's deterministic demo adapter. Runtime timeout propagates an AbortSignal into the provider request.

### Python

The Python runner executes one reviewed entrypoint under `skills/<skill-id>/`.

Contract:

```text
stdin  = one JSON value
stdout = one JSON value
stderr = bounded diagnostics
exit 0 = success
nonzero exit = EXECUTION_FAILED
```

The runner uses `shell: false`, a small environment allowlist, path containment, bounded stdout and AbortSignal cancellation. It is not an arbitrary-code sandbox.

## Source provenance

Every registered Skill pins:

- source repository;
- source path;
- human-readable ref;
- immutable 40-character commit SHA.

A Run copies this source reference.

## Manifest compatibility

Runtime supports Manifest schema `1.0` for this boundary. Unknown/unsupported runtime shapes fail closed.

Do not extend Manifest v1 with speculative fields. Additions should correspond to executable, tested behavior.

## Persistence contract

`RunStore` owns persistence. Runtime Core must not depend on a database implementation.

The current `MemoryRunStore` is suitable for local/demo execution. Any replacement must preserve:

- Run ID uniqueness;
- atomic idempotency;
- state transitions;
- source provenance;
- typed errors;
- timestamps and duration.

## Logging contract

Do not log complete user inputs, outputs, provider credentials or authorization headers by default. Operational logs should prefer Run ID, Skill ID, status, duration, runner/provider/model identifiers, byte counts and error codes.

## Completion boundary

The contract is considered implemented when reviewed LLM and Python Skills both execute through this same lifecycle from API and Workbench, and CI validates contracts, types, tests, evals, build and dependencies.
