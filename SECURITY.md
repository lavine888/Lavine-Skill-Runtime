# Security Policy

Lavine Skill Runtime treats Skill instructions and user inputs as untrusted data.

## Current security boundary

- Only reviewed, allowlisted Skills in `skills/registry.ts` can execute.
- `SKILL.md` content is never treated as arbitrary executable code.
- Unsupported runtime types fail closed.
- Inputs and outputs are validated against JSON Schema 2020-12.
- Each Skill declares timeout, payload, concurrency, and artifact limits.
- LLM provider credentials stay server-side and must never be exposed to the browser.

## Sensitive data

Career and future enterprise Skills may receive resumes, project notes, email addresses, company information, or other personal data.

Runtime code must not log complete user input or output by default. Production stores should define an explicit retention policy before persistent storage is enabled.

When an LLM provider is configured, relevant input is sent to that configured provider for execution. Deployers are responsible for choosing a provider and data-processing policy appropriate for their users.

## Reporting a vulnerability

Do not open a public issue containing secrets, credentials, private user data, or an exploitable proof of concept. Contact the repository owner privately first and include the affected version, impact, reproduction conditions, and a minimal remediation suggestion when possible.

## Out of scope today

The current v0.x runtime does not claim to safely execute arbitrary third-party Python, shell, Docker, browser, or uploaded code. Those capabilities require a separate sandbox and capability policy before public enablement.
