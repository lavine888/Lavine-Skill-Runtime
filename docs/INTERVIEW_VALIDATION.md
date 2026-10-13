# Interview Skill validation — 2026-10-13

Base Runtime commit: `c2c091952ae689087f2f4f70549f53c738c77d2e`.
Reviewed Career Alpha source: `c70c071771a808f618fb43c034de9c04c52276f4`.
Local environment: Linux, Node 24.19.0, npm 11.9.0, Python 3.
The repository's CI uses Node 22; no GitHub Actions run was triggered for this
feature branch because the existing workflow runs on main pushes and PRs only.

## Local contract

| Check | Result |
| --- | --- |
| `npm ci` | Passed with the committed dependency graph |
| `npm run skill:validate` | Passed; four valid Skills |
| `npm run typecheck` | Passed |
| `npm test` | 33 passed: 14 existing + 19 interview contract tests |
| `npm run evals` | 15 passed: 3 existing + 12 interview Demo regressions |
| `npm run build` | Next.js 16.3.8 production build passed |
| `npm audit --omit=dev --audit-level=high` | Passed; 0 production vulnerabilities reported at validation time |
| `git diff --check` | Passed |

The first audit exposed existing dependency advisories in the base lockfile.
The feature branch updates Next.js 16.3.4 → 16.3.8 and Ajv 8.17.1 → 8.20.0, plus
fast-uri 3.1.6 → 3.1.8, sharp 0.35.4 → 0.35.5 (including libvips), and
source-map-js 1.2.1 → 1.2.2. The full local contract above was rerun after these
updates. No runtime business branches or UI components were added.

## End-to-end story

A user selects Interview Risk Map, supplies a role/resume/evidence, submits the
schema-generated form, and receives a validated Run whose structured risks and
questions render in the Workbench.

The following checks used the production build on a local server and synthetic
material only. Demo was explicitly enabled for successful execution; a separate
server invocation verified the default production refusal without a provider.

| Boundary | Evidence |
| --- | --- |
| Production provider gate | HTTP 503; failed Run with `PROVIDER_AUTH_FAILED` when no key/demo opt-in exists |
| Catalog → Skill | API lists four Skills including `career-alpha-interview` |
| Input → API | Valid JSON returns HTTP 200 / completed; extra field returns HTTP 400 / `INPUT_INVALID`; oversized body returns HTTP 413 / `INPUT_TOO_LARGE` |
| Runner → RunStore | Run carries `runner: llm`, `provider: demo`, `model: deterministic` and the full pinned source; fetching its ID returns the same output |
| Idempotency | Same key/input returns the same Run ID; changed input with that key returns HTTP 409 |
| Browser → API | Playwright/Chromium submitted all three schema-generated fields; the server's recorded input matched them |
| Response → browser | `completed`, Demo notice, `add_evidence`, deterministic execution metadata and structured results were visible; no page-script errors occurred |
| Manual skill handoff | proof output passed as serialized evidence, position bullet passed as resume, and interview completed through the ordinary API; Demo only |

Browser QA required an external scratch-only Chromium binary because the environment
did not include Playwright's browser. This added no project dependency. Its font
configuration was adjusted for the local Linux environment before browser verification.

## Remaining verification

No `LLM_API_KEY` or `OPENAI_API_KEY` was configured. The explicit live-evaluation
command was checked for its missing-key refusal: it exited nonzero before any
provider calls, and no live outputs or semantic PASS results were produced.

Run `npm run evals:interview:live` with shell provider variables, then review each
of the nine synthetic rubrics as described in [INTERVIEW_SKILL.md](INTERVIEW_SKILL.md).
Contract tests and Demo regressions do not establish real model judgment quality,
prompt-injection resistance, independent evidence verification or hiring outcomes.
