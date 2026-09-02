# Contributing

Lavine Skill Runtime is contract-first. Contributions should preserve the rule that business domains live in Skill definitions, execution environments live in runners, vendors live in providers, and persistence lives in stores.

## Before opening a PR

Run:

```bash
npm install
npm run skill:validate
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

## Adding a Skill

Use `docs/ADDING_A_SKILL.md` and prefer:

```bash
npm run skill:init -- <id> <owner/repo> <source-path> <40-char-commit> <runtime>
```

A new Skill may edit the catalog boundary in `skills/registry.ts`, but should not add business-specific branches to Runtime Core.

## Runtime changes

A Runtime change should include tests for any new operational semantic, especially:

- state transitions;
- error codes;
- idempotency;
- resource limits;
- schema compatibility;
- source provenance;
- security boundaries.

## Security-sensitive changes

Python, shell, browser, filesystem, networking, persistent storage, authentication, and artifact execution changes require explicit documentation of their trust boundary and fail-closed behavior.

Do not commit provider API keys, user resumes, private production inputs, or raw secrets as fixtures.
