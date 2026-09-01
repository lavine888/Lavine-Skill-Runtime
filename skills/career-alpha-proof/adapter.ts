import type { SkillAdapter } from "../../runtime/types";
import {
  buildCareerProofPrompt,
  CAREER_ALPHA_PROOF_SYSTEM_PROMPT,
} from "./prompt";

type CareerProofInput = {
  target_role?: unknown;
  resume?: unknown;
  evidence?: unknown;
  github_url?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export const careerProofAdapter: SkillAdapter = {
  id: "career-alpha-proof",
  runtime: "llm",
  responseSchemaName: "career_proof_audit",
  buildMessages(input) {
    const typed = input as CareerProofInput;
    return {
      system: CAREER_ALPHA_PROOF_SYSTEM_PROMPT,
      user: buildCareerProofPrompt({
        target_role: text(typed.target_role),
        resume: text(typed.resume),
        evidence: text(typed.evidence) || undefined,
        github_url: text(typed.github_url) || undefined,
      }),
    };
  },
  demo(input) {
    const targetRole = text(input.target_role);
    const resume = text(input.resume);
    const evidence = text(input.evidence).trim();

    return {
      summary:
        "Demo audit completed through the same manifest, schema, adapter, run lifecycle, and output validation path used by the live runner. Configure an LLM provider for model-backed analysis.",
      claims: [
        {
          claim: resume.slice(0, 180),
          confidence: evidence ? "SUPPORTED" : "SELF-REPORTED",
          evidence: evidence ? [evidence.slice(0, 240)] : [],
          risk: evidence
            ? "The supplied material supports the existence of the work, but ownership, exact outcomes, and causality still require claim-level evidence."
            : "No external or reproducible evidence was supplied, so the claim currently depends mainly on self-report.",
          safe_wording: `Worked on experience relevant to ${targetRole}; describe only the responsibilities and outcomes you can directly support.`,
          next_action:
            "Attach the smallest direct artifact that proves ownership or outcome: a PR, benchmark, deployment record, design decision, or external result.",
        },
      ],
      next_actions: [
        "Replace broad claims with atomic claims.",
        "Attach direct evidence to the highest-value claim.",
        "Re-run the audit before moving the claim into resume or interview wording.",
      ],
    };
  },
};
