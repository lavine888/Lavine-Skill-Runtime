import json
import sys


def evaluate(data):
    checks = {
        "roe": data["roe_latest_pct"] >= 15 and data["roe_10y_min_pct"] >= 12,
        "gross_margin": data["gross_margin_latest_pct"] >= 40
        and data["gross_margin_volatility_pp"] < 10,
        "profit": bool(data["net_profit_positive"]),
        "capital_intensity": data["capex_to_net_profit_pct"] < 30,
        "debt": data["debt_to_net_profit_ratio"] < 4,
        "valuation": data["pe_ttm"] > 0 and data["pe_ttm"] < 25,
    }
    failed_rules = [name for name, passed in checks.items() if not passed]
    status = "pass" if not failed_rules else "fail"
    symbol = str(data["symbol"])

    return {
        "symbol": symbol,
        "status": status,
        "checks": checks,
        "failed_rules": failed_rules,
        "summary": (
            f"{symbol} passes all supplied ordinary-company Buffett hard rules."
            if status == "pass"
            else f"{symbol} fails {len(failed_rules)} supplied hard rule(s): {', '.join(failed_rules)}."
        ),
        "scope": "ordinary-company hard rules on supplied metrics",
        "disclaimer": (
            "This local rule check does not download PandaData, reconstruct point-in-time filings, "
            "validate ten-year coverage, or provide investment advice. Use the source screener for the full workflow."
        ),
    }


def main():
    try:
        payload = json.load(sys.stdin)
        result = evaluate(payload)
        json.dump(result, sys.stdout, ensure_ascii=False, separators=(",", ":"))
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
