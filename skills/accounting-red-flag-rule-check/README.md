# Accounting Red Flag Rule Check (offline subset)

This reviewed Python Skill evaluates **only RF01, RF02 and RF03** from
[`Accounting-Red-Flag-Detector`](https://github.com/lavine888/Accounting-Red-Flag-Detector).
It is **not** the full seven-rule historical screening pipeline.

## Input

- `symbol`: required reference label (not an authenticated security identifier)
- `net_profit_positive`: whether the supplied net profit is positive; required to assess RF01
- `cash_conversion_ratio`: CFO / net profit, ratio units (`0.8` = 80%)
- `receivables_growth_pct`: receivables growth in percentage units (`20` = 20%)
- `inventory_growth_pct`: inventory growth in percentage units
- `revenue_growth_pct`: revenue growth in percentage units

Other source rules (RF04–RF07) need additional historical evidence and are intentionally excluded.
A current gross-margin value alone is **insufficient** to test the original RF05 rule.

## Rule semantics

| ID | Trigger for review | Coverage requirements |
| --- | --- | --- |
| RF01 | CFO / net profit < 0.80 | Cash-conversion ratio and explicitly positive net profit |
| RF02 | Receivables growth > 20% **and** receivables minus revenue growth > 20 percentage points | Both growth rates |
| RF03 | Inventory growth > 20% **and** inventory minus revenue growth > 20 percentage points | Both growth rates |

Bounds are strict per the pinned source. Exactly 20% or exactly 20 percentage points does not trigger RF02/RF03.
A missing metric causes `review` rather than `pass`. Non-positive or unknown profit makes RF01 unevaluable.
`coverage.provided` counts **evaluable rules**, regardless of whether they pass or flag; `coverage.total` is 3.
Overall verdict is `pass` only if **all three** local rule states pass, otherwise `review`.

## Run locally (no API key, no network calls)

```bash
echo '{"symbol":"SYNTHETIC","net_profit_positive":true,"cash_conversion_ratio":0.7,"receivables_growth_pct":50,"revenue_growth_pct":10,"inventory_growth_pct":40}' | python3 skills/accounting-red-flag-rule-check/runner.py
```

Or run the Skill through the registered Runtime API / schema-generated web Workbench.
The Python entrypoint reads one JSON value from stdin and writes one JSON value to stdout.

## Boundaries

The Skill does not verify filings, source dates, industries, revision conflicts, corporate identity or financial-statement consistency. It does not ingest PandaData or produce an investment recommendation.
Even `pass` means only that **three supplied-metric thresholds** did not trigger; it is not proof that accounts are sound. Missing source provenance should be investigated separately.
Source pin: `lavine888/Accounting-Red-Flag-Detector`, `SKILL.md`, `ea3fccb4f863096113335b2d79aa68858e16d3f8`.
