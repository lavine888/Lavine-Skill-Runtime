# Security Model

## Trust assumptions

Lavine Skill Runtime separates four trust levels:

1. **Runtime Core** — trusted orchestration code.
2. **Reviewed adapters/runners** — trusted only after repository review and CI.
3. **Skill instructions and schemas** — treated as data/contracts, not executable authority.
4. **User input and provider output** — untrusted until validated.

## Fail-closed rules

The Runtime must reject rather than guess when:

- a Skill is not registered;
- a Manifest is invalid or uses an unsupported major version;
- a runner is not implemented;
- adapter/runtime types disagree;
- input or output violates schema;
- resource limits are exceeded;
- an idempotency key conflicts with different input.

## Provider boundary

LLM credentials are read only on the server. The Workbench never receives provider API keys.

Provider errors are normalized into Runtime error codes so vendor-specific failures do not leak into the orchestration contract.

## Python and image runtimes

The manifest protocol reserves `python` and `image`, but reserving a type does not make it executable.

Before Python is enabled publicly, the runner must define at minimum:

- allowed entrypoints;
- working-directory isolation;
- environment-variable allowlist;
- CPU/memory/process limits;
- network policy;
- filesystem policy;
- stdout/stderr bounds;
- artifact count/size enforcement;
- child-process termination on timeout.

Arbitrary repository code, arbitrary shell commands, and user-supplied executables remain out of scope for v0.x.

## Data handling

The current memory store is ephemeral. When persistent storage is added, deployment configuration must explicitly define retention, deletion, access control, encryption, and whether raw inputs/outputs are stored at all.

No telemetry or logging layer should record full resume text or other user payloads by default.
