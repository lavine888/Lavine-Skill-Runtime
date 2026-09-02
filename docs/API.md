# API v1

The versioned API is the preferred integration surface. Legacy `/api/...` routes remain as compatibility aliases during v0.x.

## Skills

```text
GET /api/v1/skills
GET /api/v1/skills/:id
```

The detail endpoint returns the manifest plus input/output schemas used by the schema-driven Workbench.

## Create a Run

```text
POST /api/v1/skills/:id/run
```

Optional header:

```text
Idempotency-Key: <client-generated-key>
```

Same Skill + key + canonical input returns the original Run. Reusing the key with different input returns HTTP 409 and `IDEMPOTENCY_CONFLICT`.

Contract errors before a Run is created return:

```json
{
  "error": {
    "code": "INPUT_INVALID",
    "message": "...",
    "retryable": false
  }
}
```

Created Runs use the Run Record contract even when execution fails.

## Runs

```text
GET /api/v1/runs
GET /api/v1/runs/:runId
```

The in-memory store is development-only, so history disappears when the process is replaced. A persistent RunStore must preserve the same API semantics.

## Run Record

Representative fields:

```json
{
  "id": "uuid",
  "skill_id": "career-alpha-proof",
  "skill_version": "0.1.0",
  "status": "completed",
  "input_hash": "sha256...",
  "idempotency_key": "optional-key",
  "runner": "llm",
  "provider": "demo",
  "model": "deterministic",
  "source": {
    "repo": "lavine888/career-alpha",
    "path": "skills/proof/SKILL.md",
    "ref": "main",
    "commit": "40-char-sha"
  },
  "created_at": "ISO-8601",
  "started_at": "ISO-8601",
  "completed_at": "ISO-8601",
  "duration_ms": 12,
  "output": {}
}
```

Failed Runs may also include `error`, `error_code`, and `retryable`.

## Compatibility

Breaking API response changes should land under a new API major version. Manifest versioning and API versioning are independent contracts.
