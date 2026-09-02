"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type SkillManifest = {
  id: string;
  name: string;
  description: string;
  version: string;
  source?: { repo: string; path: string; ref: string; commit: string };
  runtime?: { type: string };
  tags?: string[];
};

type SchemaProperty = {
  type?: string;
  title?: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  maxLength?: number;
};

type JsonSchema = {
  title?: string;
  required?: string[];
  properties?: Record<string, SchemaProperty>;
};

type SkillDetail = {
  manifest: SkillManifest;
  input_schema: JsonSchema;
  output_schema: JsonSchema;
};

type RuntimeErrorPayload = {
  code: string;
  message: string;
  retryable: boolean;
};

type RunResponse = {
  id: string;
  skill_id?: string;
  skill_version?: string;
  status: string;
  runner: string;
  provider?: string;
  model?: string;
  duration_ms?: number;
  source?: { repo: string; path: string; ref: string; commit: string };
  output?: unknown;
  error?: string;
  error_code?: string;
  retryable?: boolean;
};

function labelize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function StructuredValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="muted">None</p>;
    return (
      <div className="arrayList">
        {value.map((item, index) => (
          <div className="arrayItem" key={index}>
            <span className="index">{index + 1}</span>
            <StructuredValue value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (isRecord(value)) {
    return (
      <div className={depth === 0 ? "outputGrid" : "nestedGrid"}>
        {Object.entries(value).map(([key, child]) => (
          <section className="outputSection" key={key}>
            <div className="outputKey">{labelize(key)}</div>
            <StructuredValue value={child} depth={depth + 1} />
          </section>
        ))}
      </div>
    );
  }

  if (typeof value === "string") {
    const isConfidence = ["VERIFIED", "SUPPORTED", "SELF-REPORTED", "PLANNED"].includes(value);
    return isConfidence ? (
      <span className="confidence" data-confidence={value}>{value}</span>
    ) : (
      <p className="outputText">{value}</p>
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <code className="scalar">{String(value)}</code>;
  }

  return <p className="muted">Not supplied</p>;
}

export default function HomePage() {
  const [skills, setSkills] = useState<SkillManifest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [run, setRun] = useState<RunResponse | null>(null);
  const [requestError, setRequestError] = useState<RuntimeErrorPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    fetch("/api/skills")
      .then((response) => response.json())
      .then((data: { skills?: SkillManifest[] }) => {
        const nextSkills = data.skills || [];
        setSkills(nextSkills);
        if (nextSkills[0]) setSelectedId(nextSkills[0].id);
      })
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setRun(null);
    setRequestError(null);
    setDetail(null);
    setFormData({});

    fetch(`/api/skills/${selectedId}`)
      .then((response) => response.json())
      .then((data: SkillDetail) => {
        setDetail(data);
        const defaults: Record<string, string> = {};
        for (const [key, property] of Object.entries(data.input_schema.properties || {})) {
          if (typeof property.default === "string") defaults[key] = property.default;
        }
        setFormData(defaults);
      });
  }, [selectedId]);

  const required = useMemo(
    () => new Set(detail?.input_schema.required || []),
    [detail],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedId) return;

    setLoading(true);
    setRun(null);
    setRequestError(null);

    const payload = Object.fromEntries(
      Object.entries(formData).filter(([, value]) => value.trim().length > 0),
    );

    try {
      const response = await fetch(`/api/skills/${selectedId}/run`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as RunResponse | { error?: RuntimeErrorPayload };
      if (!("id" in data)) {
        setRequestError(
          data.error || {
            code: "REQUEST_FAILED",
            message: `Request failed with HTTP ${response.status}.`,
            retryable: false,
          },
        );
        return;
      }
      setRun(data);
    } catch (error) {
      setRequestError({
        code: "CLIENT_ERROR",
        message: error instanceof Error ? error.message : "Request failed",
        retryable: true,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">LAVINE SKILL RUNTIME · V0.3.1</span>
        <h1>One runtime. Many execution paths.</h1>
        <p>
          A contract-first execution layer with typed manifests, runner dispatch,
          provider abstraction, provenance, idempotency, resource limits, and validated outputs.
        </p>
      </section>

      <section className="catalog card">
        <div className="catalogHeader">
          <div>
            <span className="kicker">Skill registry</span>
            <h2>Runnable skills</h2>
          </div>
          <span className="status">{catalogLoading ? "loading" : `${skills.length} live`}</span>
        </div>

        <div className="skillPicker">
          {skills.map((skill) => (
            <button
              className="skillButton"
              data-active={selectedId === skill.id}
              key={skill.id}
              onClick={() => setSelectedId(skill.id)}
              type="button"
            >
              <span>{skill.name}</span>
              <small>{skill.description}</small>
              <em>{skill.runtime?.type || "runtime"} · v{skill.version}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="grid">
        <form className="card form" onSubmit={submit}>
          <div className="cardHeader">
            <div>
              <span className="kicker">Schema-generated input</span>
              <h2>{detail?.manifest.name || "Select a skill"}</h2>
            </div>
            {detail && <span className="status">{detail.manifest.runtime?.type || "Runnable"}</span>}
          </div>

          {!detail && <div className="empty compact"><p>Loading skill contract…</p></div>}

          {detail && Object.entries(detail.input_schema.properties || {}).map(([key, property]) => {
            const title = property.title || labelize(key);
            const value = formData[key] || "";
            const isLong = (property.maxLength || 0) > 500 || /resume|material|evidence|description/i.test(key);

            return (
              <label key={key}>
                <span className="fieldTitle">
                  {title}
                  {!required.has(key) && <em>optional</em>}
                </span>

                {property.enum ? (
                  <select
                    value={value}
                    onChange={(event) => setFormData((current) => ({ ...current, [key]: event.target.value }))}
                    required={required.has(key)}
                  >
                    <option value="">Choose…</option>
                    {property.enum.map((option) => <option key={option} value={option}>{labelize(option)}</option>)}
                  </select>
                ) : isLong ? (
                  <textarea
                    value={value}
                    onChange={(event) => setFormData((current) => ({ ...current, [key]: event.target.value }))}
                    placeholder={property.description || `Enter ${title.toLowerCase()}`}
                    rows={key.includes("description") ? 6 : 8}
                    required={required.has(key)}
                  />
                ) : (
                  <input
                    value={value}
                    onChange={(event) => setFormData((current) => ({ ...current, [key]: event.target.value }))}
                    placeholder={property.description || `Enter ${title.toLowerCase()}`}
                    required={required.has(key)}
                  />
                )}

                {property.description && <span className="fieldHelp">{property.description}</span>}
              </label>
            );
          })}

          {detail && (
            <>
              <button className="runButton" disabled={loading}>{loading ? "Running skill…" : "Run Skill"}</button>
              <p className="fineprint">
                No provider key? The deterministic demo adapter still passes through the same manifest, schema, registry, runner, RunStore, and output validation path.
              </p>
              {detail.manifest.source && (
                <p className="fineprint">
                  Source pinned to {detail.manifest.source.repo}@{detail.manifest.source.commit.slice(0, 8)}.
                </p>
              )}
            </>
          )}
        </form>

        <section className="card result">
          <div className="cardHeader">
            <div>
              <span className="kicker">Schema-validated output</span>
              <h2>Run result</h2>
            </div>
            {run && <span className="status">{run.status}</span>}
          </div>

          {!run && !requestError && (
            <div className="empty">
              <div className="dot" />
              <p>Run any registered skill. The renderer does not need skill-specific UI code.</p>
            </div>
          )}

          {requestError && (
            <div className="error">
              {requestError.code}: {requestError.message}
              {requestError.retryable ? " · retryable" : ""}
            </div>
          )}

          {run?.error && (
            <div className="error">
              {run.error_code ? `${run.error_code}: ` : ""}{run.error}
              {run.retryable ? " · retryable" : ""}
            </div>
          )}

          {run?.output !== undefined && (
            <div className="report">
              <div className="runMeta">
                <span>{run.skill_id || selectedId}</span>
                <code>{run.id}</code>
              </div>
              <div className="runMeta">
                <span>{run.runner} · {run.provider || "unknown"}{run.model ? ` · ${run.model}` : ""}</span>
                <code>{run.duration_ms ?? 0} ms</code>
              </div>
              {run.source && (
                <div className="runMeta">
                  <span>{run.source.repo}</span>
                  <code>{run.source.commit.slice(0, 12)}</code>
                </div>
              )}
              <StructuredValue value={run.output} />
            </div>
          )}
        </section>
      </section>

      <section className="architecture">
        <span>manifest</span><b>→</b><span>schema</span><b>→</b><span>registry</span><b>→</b><span>runner</span><b>→</b><span>provider</span><b>→</b><span>RunStore</span><b>→</b><span>validated output</span>
      </section>
    </main>
  );
}
