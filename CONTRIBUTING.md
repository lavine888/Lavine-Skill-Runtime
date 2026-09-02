# Contributing

Lavine Skill Runtime is contract-first. Contributions should preserve the rule that business domains live in Skill definitions, execution environments live in runners, vendors live in providers, and persistence lives in stores.

## Before opening a PR

Use the committed lockfile and run the same contract checks as CI:

```bash
npm ci
npm run skill:validate
npm run typecheck
npm test
npm run evals
npm run build
npm audit --omit=dev --audit-level=high
```

Do not replace `npm ci` with an unreviewed dependency refresh in a validation-only change. Dependency upgrades should be explicit and should update `package-lock.json` intentionally.

## Adding a Skill

Use `docs/ADDING_A_SKILL.md` and prefer:

```bash
npm run skill:init -- <id> <owner/repo> <source-path> <40-char-commit> <runtime>
```

A new Skill may edit the catalog boundary in `skills/registry.ts`, but should not add business-specific branches to Runtime Core.

## Runtime changes

A Runtime change should include tests for any new operational semantic, especially:

- state transitions;
- error codes and retryability;
- atomic idempotency under concurrency;
- timeout/cancellation propagation;
- resource limits;
- schema compatibility;
- source provenance;
- security boundaries.

Read `docs/ARCHITECTURE.md` before changing Core, runners, providers, or stores.

## RunStore changes

Persistent RunStore implementations must preserve atomic creation for `(skill_id, idempotency_key)`. Prefer a database uniqueness constraint/transaction rather than a `SELECT`-then-unguarded-`INSERT` pattern.

## Provider and Runner changes

Long-running or billable backends should accept cancellation when the underlying SDK/process supports it. A Runtime timeout should not intentionally leave provider work running in the background.

Python, shell, browser, filesystem, networking, persistent storage, authentication, and artifact execution changes require explicit documentation of their trust boundary and fail-closed behavior.

## Security-sensitive data

Do not commit provider API keys, user resumes, private production inputs, raw secrets, or real personal data as fixtures. Prefer synthetic fixtures that preserve only the behavior being tested.
