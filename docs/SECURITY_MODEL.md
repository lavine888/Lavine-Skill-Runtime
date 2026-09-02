# Security Model

## Trust assumptions

Lavine Skill Runtime separates four trust levels:

1. **Runtime Core** — trusted orchestration code.
2. **Reviewed adapters and repo-local Python entrypoints** — trusted only after code review and CI.
3. **Skill instructions and schemas** — contracts/data, not authority to execute arbitrary commands.
4. **User input and provider output** — untrusted until validated.

## Fail closed

Runtime rejects rather than guesses when:

- a Skill is not registered;
- a Manifest is invalid;
- a runtime type is not implemented;
- adapter/runtime identities disagree;
- input or output violates schema;
- resource limits are exceeded;
- an idempotency key is reused with different input;
- a Python entrypoint escapes its Skill directory;
- the Python executable is unavailable.

## LLM provider boundary

LLM credentials remain server-side. Workbench never receives provider API keys.

Provider errors are normalized into stable Runtime errors. Timeout propagates AbortSignal into the provider request when supported.

## Python boundary

Python execution is enabled only for reviewed, allowlisted Skills.

The runner currently enforces:

- fixed manifest-declared entrypoint;
- entrypoint containment under `skills/<skill-id>/`;
- direct process execution with `shell: false`;
- JSON-only stdin/stdout contract;
- bounded stdout and bounded diagnostic stderr;
- small environment allowlist instead of inheriting application secrets;
- Runtime timeout propagated through AbortSignal to the child process.

The runner does **not** provide OS/container-level isolation for network, filesystem, CPU or memory. Therefore:

- arbitrary uploaded Python is not accepted;
- user-provided commands/file paths are not executed;
- unreviewed third-party repositories must not be registered;
- public arbitrary-code execution is explicitly out of scope.

If those requirements ever change, a real sandbox is a separate product/security milestone rather than an incremental flag on this runner.

## Data handling

The current `MemoryRunStore` is ephemeral. Full user payloads should not be written to operational logs.

If persistent storage is introduced for a concrete product requirement, retention, deletion, access control, encryption and raw-payload storage policy must be decided before deployment.

Career inputs may contain sensitive personal/work information; configured LLM Skills send relevant input to the selected model provider. Deployers are responsible for choosing an appropriate provider/data policy.
