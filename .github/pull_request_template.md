## What this changes

<!-- One paragraph. What behavior or contract changes, and why. -->

## Layer ownership

<!-- Keep business domains in Skills, execution environments in runners, vendors in providers, persistence in stores. -->

- [ ] Business logic stays in the Skill, not in Runtime Core.
- [ ] No new business-specific branches in `runtime/`.
- [ ] Any new trust boundary (Python, filesystem, network, storage) is documented and fails closed.

## Contract checks

```bash
npm ci
npm run skill:validate
npm run typecheck
npm test
npm run evals
npm run build
npm audit --omit=dev --audit-level=high
```

- [ ] The commands above pass locally.

## New Skill checklist (only if this PR adds a Skill)

- [ ] Full 40-character source commit pinned in `manifest.json`.
- [ ] Input and output are JSON Schema 2020-12.
- [ ] Bounded `timeout_seconds`, `max_input_bytes`, `max_output_bytes`, `max_concurrency`.
- [ ] Registered explicitly in `skills/registry.ts`.
- [ ] No provider access inside the Skill.
