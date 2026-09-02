# Architecture

Lavine Skill Runtime is a contract-first execution layer. Its core job is to coordinate trusted adapters and reviewed execution backends without learning the business semantics of each Skill.

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
        ↓
Runner
        ↓
Provider / process backend
        ↓
Validated output + RunStore
```

The intended ownership model is:

- **Skill definitions** own domain behavior.
- **Runtime Core** owns execution semantics.
- **Runners** own execution-environment behavior.
- **Providers** own vendor-specific APIs.
- **RunStore** owns persistence semantics.
- **ArtifactStore** will own large/file outputs when introduced.

## Core invariants

### 1. Runtime Core does not understand business meaning

Adding a career, quant, illustration, or future enterprise Skill must not introduce branches such as:

```ts
if (skill.id === "some-business-skill") {
  // domain logic
}
```

Business-specific prompts, transformations, and deterministic demo behavior belong to the Skill adapter.

### 2. Unsupported execution fails closed

A manifest may describe `llm`, `python`, or `image`, but the Runtime advertises only runner types that are actually registered. A missing runner is an execution error, never an implicit fallback.

### 3. Source provenance is immutable per Skill version

Every registered Skill pins:

```text
repository
path
ref
40-character commit SHA
```

A Run copies this source reference so historical execution can be traced to the reviewed source revision.

### 4. Idempotent creation must be atomic

`Idempotency-Key` is a correctness contract, not only a lookup optimization.

The RunStore `create()` operation must atomically ensure that the same `(skill_id, idempotency_key)` cannot create two Runs. The in-memory implementation achieves this inside one JavaScript process. A persistent implementation should use a database unique constraint/transaction, for example:

```text
UNIQUE(skill_id, idempotency_key)
```

Do not implement a persistent store as `SELECT` followed by an unguarded `INSERT`; that reintroduces a race under concurrency.

If the same key is reused with a different canonical input hash, Runtime returns `IDEMPOTENCY_CONFLICT`.

### 5. Timeout attempts to stop underlying work

Runtime timeouts use an `AbortController` and propagate its `AbortSignal` through the Runner into supported providers. The OpenAI-compatible provider passes the signal into the SDK request.

This matters because returning a timeout without cancelling the underlying network request can continue consuming provider capacity or cost after the client has already received an error.

Future Python/Image runners should provide equivalent cancellation semantics where the backend supports them.

### 6. Resource policy is declared before execution

Each Skill declares bounded limits for:

- timeout;
- input JSON bytes;
- output JSON bytes;
- per-process concurrency;
- artifact count.

Python execution will need additional enforceable limits such as memory, filesystem scope, network policy, process tree termination, and total artifact bytes before arbitrary third-party code is considered.

### 7. RunStore is replaceable, semantics are not

The current MemoryRunStore is for development only. A future Postgres implementation must preserve:

- atomic idempotent creation;
- stable Run IDs;
- lifecycle updates;
- source provenance;
- typed error fields;
- ordering for history queries.

Persistence changes must not require business-Skill changes.

## Run lifecycle

```text
queued
  ↓
running
  ├── completed
  ├── failed
  └── timed_out
```

`cancelled` is reserved for a future asynchronous worker/queue layer. It should not be reported until Runtime can actually signal cancellation to the execution backend and persist the state transition safely.

## API boundary

`/api/v1/...` is the preferred external contract. Legacy `/api/...` routes are v0.x compatibility aliases.

HTTP is an adapter around Runtime semantics; route handlers should not duplicate Skill business logic.

## Security boundary

The Runtime executes only reviewed, allowlisted definitions from `skills/registry.ts`. `SKILL.md` is treated as instruction/data, not arbitrary executable code.

See:

- `SECURITY.md`
- `docs/SECURITY_MODEL.md`
- `docs/RUNTIME_CONTRACT.md`

## Next architectural milestone

The next meaningful proof is a Python Runner using the same manifest, registry, lifecycle, idempotency, error, provenance, and RunStore contracts. The Python backend should be added only after its process isolation and artifact policies are explicit.
