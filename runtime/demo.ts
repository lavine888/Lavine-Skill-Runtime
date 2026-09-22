/**
 * Deterministic demo execution is a development convenience, not a silent
 * production fallback. It must be allowed explicitly.
 *
 * Allowed when:
 * - LLM_ALLOW_DEMO is truthy ("1" / "true" / "yes" / "on"), or
 * - the process is not running in production (dev / test default to demo).
 */
const TRUTHY = new Set(["1", "true", "yes", "on"]);

export function isDemoExecutionAllowed() {
  const flag = (process.env.LLM_ALLOW_DEMO || "").trim().toLowerCase();
  if (TRUTHY.has(flag)) return true;
  return process.env.NODE_ENV !== "production";
}
