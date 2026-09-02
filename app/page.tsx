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
  enum?: Array<string | number>;
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

function coerceInput(property: SchemaProperty | undefined, raw: string): unknown {
  if (property?.type === "number" || property?.type === "integer") return Number(raw);
  if (property?.type === "boolean") return raw === "true";
  return raw;
}

function StructuredValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="muted">None</p>;
    return (
      <div className="arrayList">
        {value.map((item, index) => (
          <div className="arrayItem" key={index}>
            <span className="index">{String(index + 1).padStart(2, "0")}</span>
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
          if (["string", "number", "boolean"].includes(typeof property.default)) {
            defaults[key] = String(property.default);
          }
        }
        setFormData(defaults);
      });
  }, [selectedId]);

  const required = useMemo(
    () => new Set(detail?.input_schema.required || []),
    [detail],
  );

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedId),
    [skills, selectedId],
  );

  const runnerCount = useMemo(
    () => new Set(skills.map((skill) => skill.runtime?.type).filter(Boolean)).size,
    [skills],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !detail) return;

    setLoading(true);
    setRun(null);
    setRequestError(null);

    const payload = Object.fromEntries(
      Object.entries(formData)
        .filter(([, value]) => value.trim().length > 0)
        .map(([key, value]) => [
          key,
          coerceInput(detail.input_schema.properties?.[key], value),
        ]),
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
      <header className="topbar">
        <div className="brandMark"><b>LVN</b><span>/</span>SKILL RUNTIME</div>
        <div className="topbarMeta">
          <span>RUNNABLE BOUNDARY</span>
          <span className="liveMark"><i />{catalogLoading ? "SYNC" : "LIVE"}</span>
        </div>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <span className="eyebrow">Execution instrument · 2026</span>
          <h1>
            Run skills,<br />
            <em>not wrappers.</em>
          </h1>
        </div>
        <div className="heroAside">
          <p>
            A deliberately small runtime for reviewed LLM and Python Skills.
            Typed contracts in. Bounded execution. Validated output out.
          </p>
          <div className="heroStats">
            <div><strong>{String(skills.length).padStart(2, "0")}</strong><span>skills</span></div>
            <div><strong>{String(runnerCount).padStart(2, "0")}</strong><span>runners</span></div>
          </div>
        </div>
      </section>

      <section className="registrySection">
        <div className="sectionRail">
          <span>01</span>
          <p>Registry</p>
        </div>
        <div className="registryBody">
          <div className="sectionHeading">
            <div>
              <span className="kicker">Reviewed catalog</span>
              <h2>Choose an execution contract.</h2>
            </div>
            <p>{catalogLoading ? "Reading registry…" : `${skills.length} reviewed skills / ${runnerCount} execution paths`}</p>
          </div>

          <div className="skillPicker">
            {skills.map((skill, index) => (
              <button
                className="skillButton"
                data-active={selectedId === skill.id}
                key={skill.id}
                onClick={() => setSelectedId(skill.id)}
                type="button"
                aria-pressed={selectedId === skill.id}
              >
                <span className="skillIndex">{String(index + 1).padStart(2, "0")}</span>
                <span className="skillName">{skill.name}</span>
                <span className="skillDescription">{skill.description}</span>
                <span className="skillRuntime">{skill.runtime?.type || "runtime"} / v{skill.version}</span>
                <span className="skillArrow">↗</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="workbenchSection">
        <div className="sectionRail">
          <span>02</span>
          <p>Workbench</p>
        </div>

        <div className="workbenchBody">
          <div className="selectedContract">
            <div>
              <span className="kicker">Active contract</span>
              <h2>{selectedSkill?.name || "Select a skill"}</h2>
            </div>
            <div className="contractMeta">
              <span>{selectedSkill?.runtime?.type || "—"}</span>
              <span>{selectedSkill ? `v${selectedSkill.version}` : "—"}</span>
              <span>{selectedSkill?.source?.commit.slice(0, 8) || "—"}</span>
            </div>
          </div>

          <div className="workbenchGrid">
            <form className="formPanel" onSubmit={submit}>
              <div className="panelHeader">
                <span>INPUT / SCHEMA</span>
                <span>{detail ? `${Object.keys(detail.input_schema.properties || {}).length} fields` : "loading"}</span>
              </div>

              {!detail && <div className="empty compact"><p>Loading contract…</p></div>}

              {detail && Object.entries(detail.input_schema.properties || {}).map(([key, property], index) => {
                const title = property.title || labelize(key);
                const value = formData[key] || "";
                const isLong = (property.maxLength || 0) > 500 || /resume|material|evidence|description/i.test(key);

                return (
                  <label key={key} className="fieldGroup">
                    <span className="fieldNo">{String(index + 1).padStart(2, "0")}</span>
                    <span className="fieldTitle">
                      {title}
                      {!required.has(key) && <em>optional</em>}
                    </span>

                    <div className="fieldControl">
                      {property.enum ? (
                        <select
                          value={value}
                          onChange={(event) => setFormData((current) => ({ ...current, [key]: event.target.value }))}
                          required={required.has(key)}
                        >
                          <option value="">Choose…</option>
                          {property.enum.map((option) => (
                            <option key={String(option)} value={String(option)}>{labelize(String(option))}</option>
                          ))}
                        </select>
                      ) : property.type === "boolean" ? (
                        <select
                          value={value}
                          onChange={(event) => setFormData((current) => ({ ...current, [key]: event.target.value }))}
                          required={required.has(key)}
                        >
                          <option value="">Choose…</option>
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : property.type === "number" || property.type === "integer" ? (
                        <input
                          type="number"
                          step={property.type === "integer" ? "1" : "any"}
                          value={value}
                          onChange={(event) => setFormData((current) => ({ ...current, [key]: event.target.value }))}
                          placeholder={property.description || `Enter ${title.toLowerCase()}`}
                          required={required.has(key)}
                        />
                      ) : isLong ? (
                        <textarea
                          value={value}
                          onChange={(event) => setFormData((current) => ({ ...current, [key]: event.target.value }))}
                          placeholder={property.description || `Enter ${title.toLowerCase()}`}
                          rows={key.includes("description") ? 5 : 7}
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
                    </div>
                  </label>
                );
              })}

              {detail && (
                <div className="runArea">
                  <button className="runButton" disabled={loading}>
                    <span>{loading ? "EXECUTING" : "RUN CONTRACT"}</span>
                    <b>{loading ? "···" : "↗"}</b>
                  </button>
                  <p>
                    {detail.manifest.runtime?.type === "python"
                      ? "Reviewed repo-local Python entrypoint. No shell and no user-provided code."
                      : "Configured provider when available; deterministic demo otherwise."}
                  </p>
                </div>
              )}
            </form>

            <section className="resultPanel">
              <div className="panelHeader">
                <span>OUTPUT / VALIDATED</span>
                <span className={run?.status === "completed" ? "resultState success" : "resultState"}>
                  {run?.status || "idle"}
                </span>
              </div>

              {!run && !requestError && (
                <div className="empty outputEmpty">
                  <span className="outputGlyph">⌁</span>
                  <p>Execution output will resolve here.</p>
                  <small>JSON schema validated / provenance attached</small>
                </div>
              )}

              {requestError && (
                <div className="error">
                  <strong>{requestError.code}</strong>
                  <span>{requestError.message}</span>
                  {requestError.retryable && <em>retryable</em>}
                </div>
              )}

              {run?.error && (
                <div className="error">
                  <strong>{run.error_code || "EXECUTION_ERROR"}</strong>
                  <span>{run.error}</span>
                  {run.retryable && <em>retryable</em>}
                </div>
              )}

              {run?.output !== undefined && (
                <div className="report">
                  <div className="runLedger">
                    <div><span>run</span><code>{run.id}</code></div>
                    <div><span>path</span><code>{run.runner} / {run.provider || "local"}{run.model ? ` / ${run.model}` : ""}</code></div>
                    <div><span>time</span><code>{run.duration_ms ?? 0} ms</code></div>
                    {run.source && <div><span>source</span><code>{run.source.repo}@{run.source.commit.slice(0, 8)}</code></div>}
                  </div>
                  <StructuredValue value={run.output} />
                </div>
              )}
            </section>
          </div>
        </div>
      </section>

      <footer className="architecture">
        <span>manifest</span><b>→</b><span>schema</span><b>→</b><span>registry</span><b>→</b><span>runner</span><b>→</b><span>validated output</span><b>→</b><span>RunStore</span>
      </footer>
    </main>
  );
}
