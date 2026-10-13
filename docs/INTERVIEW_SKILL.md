# Interview Risk Map

`career-alpha-interview` adapts the reviewed Career Alpha `/interview` into a
one-shot web/API product. It finds claim-specific preparation concerns and returns
targeted questions plus one corrective action: `add_evidence`, `add_knowledge`, or
`downgrade`. It does not implement live multi-turn drilling, scores or hiring predictions.

## Reviewed source

- Repository: `lavine888/career-alpha`
- Source: `skills/interview/SKILL.md`
- Commit: `c70c071771a808f618fb43c034de9c04c52276f4`
- Supporting material at the same commit:
  `skills/interview/references/question-ladders.md` and
  `references/claim-evidence-ledger.md`.

The manifest records the source; `prompt.ts` is a bounded adaptation of its risk-map,
ownership, measurement, questioning and corrective-action principles. It is not a
verbatim copy of the entire interactive Skill. Runtime Core and provider code do not
contain interview-specific dispatch.

## Contract

Input: required `target_role` and `resume`, optional `evidence` text (including a
serialized Claim–Evidence Ledger). Evidence links and ledger labels are supplied
data, not independent verification. No URLs are fetched by this Skill.

Output:

```json
{
  "risks": [{
    "claim": "Led delivery of an AI prototype with a small team.",
    "why_attackable": "A preparation hypothesis: clarify which delivery decisions were yours and attach a contribution artifact.",
    "action": "add_evidence"
  }],
  "questions": [{
    "question": "Which delivery decisions were yours, and what did teammates implement?",
    "targets": "Led delivery of an AI prototype with a small team."
  }]
}
```

This output is illustrative, not a measured model result. Risk claims should be
verbatim excerpts from the resume; question targets should match a risk claim.
Those semantic relationships are checked in the opt-in live evaluation, not enforced
by JSON Schema alone. Empty arrays are valid when no concrete concern is supported.
Objects reject additional properties. Output is limited to 8 risks / 16 questions,
2000 characters per text field, and 64 KiB total. Inputs allow 30000 characters each
for resume/evidence, with a 256 KiB total limit. Execution uses a 120-second timeout
and concurrency limit of 2.

## Try it

Open the Workbench, select **Interview Risk Map**, then enter your target role,
resume and optional evidence. The existing schema-generated form and JSON result
renderer support the Skill without UI changes.

```bash
curl -X POST http://localhost:3000/api/v1/skills/career-alpha-interview/run \
  -H 'content-type: application/json' \
  -H 'idempotency-key: interview-example-001' \
  -d '{"target_role":"AI Product Manager","resume":"Led delivery of an AI prototype with a small team."}'
```

Without a provider key, development uses a deterministic **Demo only** result. It
echoes a bounded resume excerpt and conservative evidence/ownership questions; it
does not select claim types, judge the nine semantic rubrics, or verify evidence.
Run metadata identifies `provider: demo`, `model: deterministic`. Production still
rejects execution without a provider unless `LLM_ALLOW_DEMO=1` is explicitly enabled.

## Evaluation layers

```bash
npm test
npm run evals
```

- `tests/interview.test.ts`: registration, provenance, invalid input rejected before
  execution, idempotency, malformed provider output, generic provider handoff and
  production fail-closed behavior. Provider responses in these tests are mocked.
- `tests/interview.evals.test.ts`: deterministic Demo consistency, bounded excerpts,
  targets and message construction. These do **not** demonstrate model judgment or
  injection resistance.
- `evals/career-alpha-interview.json`: nine synthetic cases with manual semantic
  rubrics: unsupported metrics, team ownership, demo/production, benchmark limits,
  supported contributions, AI assistance, conflicting placement, embedded commands
  and an explicitly stated knowledge gap.

For real model outputs, configure provider variables **in the shell environment**
(`LLM_API_KEY`, optional `LLM_BASE_URL`, `LLM_MODEL`, `LLM_PROVIDER`), then run:

```bash
npm run evals:interview:live
```

Unlike Next.js, this Vitest command does not automatically load `.env.local`.
The command makes up to nine provider calls through the normal Runtime. It fails
without a key; it never silently substitutes Demo. Outputs are written to a unique
JSON report under ignored `.interview-eval/`, with source, provider/model, inputs and
manual rubric. It automatically checks execution, Schema and claim/target anchoring.
**Passing this command does not mean semantic quality passed.**

Review each report entry against its rubric and classify `PASS`, `PARTIAL` or `FAIL`
with a concrete output excerpt. Verify no invented achievement, no unsupported
ownership/stage upgrade, no knowledge-gap inference from absent evidence, no
bluffing, and useful corrective steps. Record the model/configuration and failures;
do not report job-search success or model superiority from these synthetic cases.

## Related projects and manual demonstration

Career Alpha owns the methodology. Career Junshi remains an independent host-driven
decision Skill; its situation handling and consented memory are not imported here.
A user can manually pass `/proof` output into evidence, use `/position` to create
bounded wording, then submit that wording to `/interview` for questions. This is a
manual workflow, not an automatic pipeline or Junshi integration.
