# Architecture

Lavine Skill Runtime is a deliberately small contract-first execution layer. It coordinates reviewed LLM and Python Skills without learning their business semantics.

## Layer boundaries

```text
Reviewed Skill source
        ↓
Manifest + JSON Schemas + Adapter
        ↓
Skill Registry
        ↓
Runtime Core
        ├── validation
        ├── idempotency
        ├── lifecycle
        ├── resource policy
        └── provenance
        ↓
Runner Registry
   ┌────┴────┐
   │         │
  LLM      Python
   │         │
Provider   fixed subprocess
   └────┬────┘
        ↓
Validated output + RunStore
```

Ownership is intentionally simple:

- **Skill definitions** own domain behavior.
- **Runtime Core** owns execution semantics.
- **Runners** own execution-environment behavior.
- **Providers** own vendor-specific LLM APIs.
- **RunStore** owns Run persistence semantics.

## Core invariants

### 1. Runtime Core does not understand business meaning

A new Skill may extend `skills/registry.ts`, schemas, adapters and reviewed entrypoints. It must not add business-specific branches to `runtime/index.ts`.

### 2. The manifest describes only implemented execution paths

Manifest v1 accepts exactly:

```text
llm
python
```

There is no image/browser/artifact execution contract in the current boundary. Unsupported capabilities are not scaffolded or advertised.

### 3. Source provenance is immutable per Skill version

Every registered Skill pins repository, path, ref and a 40-character commit SHA. Each Run copies that source reference.

### 4. Idempotent creation is atomic

`Idempotency-Key` is enforced by `RunStore.create()`, not by a separate read-before-write check. A persistent store must preserve this with a transaction or unique constraint such as:

```text
UNIQUE(skill_id, idempotency_key)
```

Reusing a key with different canonical input returns `IDEMPOTENCY_CONFLICT`.

### 5. Timeout attempts to stop underlying work

Runtime creates an `AbortController` for every execution.

- LLM requests receive the AbortSignal through the provider SDK.
- Python subprocesses receive the AbortSignal through `child_process.spawn`.

A timeout is therefore an attempt to stop work, not only an early HTTP response.

### 6. Python is reviewed subprocess execution, not a sandbox

The Python runner:

- resolves the entrypoint inside `skills/<skill-id>/`;
- rejects path escape;
- invokes a Python executable directly with `shell: false`;
- accepts JSON on stdin and expects one JSON value on stdout;
- bounds stdout using the Skill output limit;
- forwards only a small environment allowlist;
- does not forward application/provider secrets;
- supports cancellation via AbortSignal.

It does **not** safely execute arbitrary uploaded or third-party code. Only allowlisted repository code should be registered.

### 7. Resource policy is small and enforceable

Each Skill declares only limits enforced today:

```text
timeout_seconds
max_input_bytes
max_output_bytes
max_concurrency
```

Do not add a limit field until Runtime actually enforces it.

### 8. RunStore is replaceable; semantics are not

The current `MemoryRunStore` is suitable for local/demo execution. A future store, if product requirements justify one, must preserve atomic idempotency, lifecycle updates, source provenance, typed errors and stable Run IDs without changing Skill business logic.

## Run lifecycle

```text
queued
  ↓
running
  ├── completed
  ├── failed
  └── timed_out
```

No other state is part of the current contract.

## API boundary

`/api/v1/...` is the preferred external contract. HTTP routes are adapters around Runtime semantics and must not contain Skill business logic.

## Definition of done

This architecture is considered complete for the current boundary when:

1. at least one reviewed LLM Skill runs through the generic LLM runner;
2. at least one reviewed Python Skill runs through the generic Python runner;
3. both use the same manifest, validation, provenance, idempotency, lifecycle and RunStore contracts;
4. both are runnable from API and the schema-generated Workbench;
5. contract validation, tests, evals, production build and dependency audit pass in CI.

Anything beyond that requires a concrete product need rather than architectural speculation.
