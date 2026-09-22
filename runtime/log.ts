/**
 * Minimal structured event logging. Events carry run metadata only — never
 * full user input, output payloads, or provider credentials (see
 * docs/RUNTIME_CONTRACT.md, Logging contract).
 */
const enabled = () => process.env.LOG_EVENTS !== "off";

export function logEvent(event: string, fields: Record<string, unknown> = {}) {
  if (!enabled()) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...fields });
  // Server-side operational log stream; not part of the HTTP API contract.
  console.log(line);
}
