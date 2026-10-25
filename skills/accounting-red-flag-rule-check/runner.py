"""Small, offline subset of Accounting Red Flag Detector RF01–RF03.

Inputs are supplied metrics, not verified point-in-time evidence.
Growth inputs are percentages: 20 means 20%, not 0.20.
"""
import json
import math
import sys

NUMBER_FIELDS = (
    "cash_conversion_ratio",
    "receivables_growth_pct",
    "revenue_growth_pct",
    "inventory_growth_pct",
)
ALLOWED_FIELDS = set(NUMBER_FIELDS) | {"symbol", "net_profit_positive"}


def evaluate(payload):
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object")
    symbol = payload.get("symbol")
    if not isinstance(symbol, str) or not symbol.strip() or len(symbol) > 40:
        raise ValueError("symbol must be a nonempty string of at most 40 characters")
    unexpected = set(payload) - ALLOWED_FIELDS
    if unexpected:
        raise ValueError("Unsupported input field(s): " + ", ".join(sorted(unexpected)))
    for field in NUMBER_FIELDS:
        if field in payload and (
            type(payload[field]) not in (int, float) or not math.isfinite(payload[field])
        ):
            raise ValueError(field + " must be a finite number")
    if "net_profit_positive" in payload and type(payload["net_profit_positive"]) is not bool:
        raise ValueError("net_profit_positive must be a boolean")

    flags = []
    evaluated = 0

    # RF01: The cash conversion ratio needs positive net profit to be meaningful.
    if "cash_conversion_ratio" not in payload or "net_profit_positive" not in payload:
        missing = [k for k in ("cash_conversion_ratio", "net_profit_positive") if k not in payload]
        flags.append({"rule": "RF01", "state": "review",
                      "reason": "Missing " + ", ".join(missing) + "; cannot evaluate cash conversion."})
    elif payload["net_profit_positive"] is not True:
        flags.append({"rule": "RF01", "state": "review",
                      "reason": "Non-positive net profit: cash conversion ratio cannot be interpreted under this subset."})
    else:
        evaluated += 1
        ratio = payload["cash_conversion_ratio"]
        flagged = ratio < 0.80
        flags.append({"rule": "RF01", "state": "review" if flagged else "pass",
                      "reason": "Supplied CFO / net profit " + format(ratio, ".4g") +
                      (" < 0.80 (cash-flow divergence)." if flagged else " >= 0.80 (no RF01 trigger).")})

    # RF02 and RF03: the source uses > 0.20 ratios; input units are percent.
    for rule, field, title in (
        ("RF02", "receivables_growth_pct", "Receivables"),
        ("RF03", "inventory_growth_pct", "Inventory"),
    ):
        missing = [k for k in (field, "revenue_growth_pct") if k not in payload]
        if missing:
            flags.append({"rule": rule, "state": "review",
                          "reason": "Missing " + ", ".join(missing) + "; cannot evaluate growth divergence."})
            continue
        evaluated += 1
        growth = payload[field]
        revenue = payload["revenue_growth_pct"]
        excess = growth - revenue
        flagged = growth > 20.0 and excess > 20.0
        flags.append({"rule": rule, "state": "review" if flagged else "pass",
                      "reason": (
                          f"Supplied {title.lower()} growth {growth:.4g}%, revenue growth {revenue:.4g}%, "
                          f"difference {excess:.4g} percentage points; "
                          + ("both strict >20 thresholds triggered." if flagged else "no dual-threshold trigger.")
                      )})

    verdict = "pass" if all(flag["state"] == "pass" for flag in flags) else "review"
    return {
        "symbol": symbol,
        "flags": flags,
        "verdict": verdict,
        "coverage": {"provided": evaluated, "total": 3},
        "scope": "RF01–RF03 on supplied metrics only; no data ingestion or point-in-time verification",
        "disclaimer": (
            "No market or filing data is downloaded. Inputs are not authenticated, dated, "
            "industry-screened, or independently verified. 'pass' means only that three "
            "local thresholds were not triggered on sufficiently supplied metrics; "
            "it is not a clean audit, fraud finding, or investment recommendation."
        ),
    }


def main():
    try:
        payload = json.load(sys.stdin)
        result = evaluate(payload)
        json.dump(result, sys.stdout, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    except (ValueError, TypeError, KeyError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
