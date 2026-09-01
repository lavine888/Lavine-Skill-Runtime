"use client";

import { FormEvent, useState } from "react";

type Audit = {
  summary: string;
  claims: Array<{
    claim: string;
    confidence: "VERIFIED" | "SUPPORTED" | "SELF-REPORTED" | "PLANNED";
    evidence: string[];
    risk: string;
    safe_wording: string;
    next_action: string;
  }>;
  next_actions: string[];
};

type RunResponse = {
  id: string;
  status: string;
  runner: "openai" | "demo";
  output?: Audit;
  error?: string;
};

export default function HomePage() {
  const [targetRole, setTargetRole] = useState("AI Product Manager");
  const [resume, setResume] = useState("");
  const [evidence, setEvidence] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [run, setRun] = useState<RunResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setRun(null);

    try {
      const response = await fetch("/api/skills/career-alpha-proof/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target_role: targetRole,
          resume,
          evidence: evidence || undefined,
          github_url: githubUrl || undefined,
        }),
      });
      const data = await response.json();
      setRun(data);
    } catch (error) {
      setRun({
        id: "client-error",
        status: "failed",
        runner: "demo",
        error: error instanceof Error ? error.message : "Request failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">LAVINE SKILL RUNTIME · V0.1</span>
        <h1>Turn SKILL.md into runnable products.</h1>
        <p>
          The MVP runs one reviewed Skill through a real manifest, schema validation,
          runner dispatch, output validation, and run lifecycle.
        </p>
      </section>

      <section className="grid">
        <form className="card form" onSubmit={submit}>
          <div className="cardHeader">
            <div>
              <span className="kicker">Career Alpha</span>
              <h2>Career Proof Audit</h2>
            </div>
            <span className="status">Runnable</span>
          </div>

          <label>
            Target role
            <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} required />
          </label>

          <label>
            Resume / experience
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste the claims, bullets, project description, or experience you want audited."
              rows={9}
              minLength={20}
              required
            />
          </label>

          <label>
            Evidence <span>optional</span>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Repos, PRs, benchmarks, deployment records, competition results, feedback..."
              rows={5}
            />
          </label>

          <label>
            GitHub URL <span>optional</span>
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/..."
            />
          </label>

          <button disabled={loading}>{loading ? "Running audit..." : "Run Skill"}</button>
          <p className="fineprint">
            No API key? The runtime automatically uses a deterministic demo runner so the full pipeline remains testable.
          </p>
        </form>

        <section className="card result">
          <div className="cardHeader">
            <div>
              <span className="kicker">Run result</span>
              <h2>Evidence Report</h2>
            </div>
            {run && <span className="status">{run.runner}</span>}
          </div>

          {!run && (
            <div className="empty">
              <div className="dot" />
              <p>Submit a career claim to see the Runtime produce a schema-validated report.</p>
            </div>
          )}

          {run?.error && <div className="error">{run.error}</div>}

          {run?.output && (
            <div className="report">
              <div className="summary">{run.output.summary}</div>

              {run.output.claims.map((claim, index) => (
                <article className="claim" key={`${claim.claim}-${index}`}>
                  <div className="claimTop">
                    <span>Claim {index + 1}</span>
                    <strong data-confidence={claim.confidence}>{claim.confidence}</strong>
                  </div>
                  <h3>{claim.claim}</h3>
                  <dl>
                    <div>
                      <dt>Risk</dt>
                      <dd>{claim.risk}</dd>
                    </div>
                    <div>
                      <dt>Safe wording</dt>
                      <dd>{claim.safe_wording}</dd>
                    </div>
                    <div>
                      <dt>Next evidence</dt>
                      <dd>{claim.next_action}</dd>
                    </div>
                  </dl>
                </article>
              ))}

              <div className="actions">
                <span className="kicker">Next actions</span>
                <ol>
                  {run.output.next_actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </section>
      </section>

      <section className="architecture">
        <span>manifest</span><b>→</b><span>schema</span><b>→</b><span>registry</span><b>→</b><span>runner</span><b>→</b><span>validated output</span>
      </section>
    </main>
  );
}
