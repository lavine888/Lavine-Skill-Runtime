import type { LlmSkillAdapter } from "../../runtime/types";
import { CAREER_ALPHA_INTERVIEW_SYSTEM_PROMPT, buildCareerInterviewPrompt } from "./prompt";

export type InterviewRiskMap = {
  risks: Array<{
    claim: string;
    why_attackable: string;
    action: "add_evidence" | "add_knowledge" | "downgrade";
  }>;
  questions: Array<{ question: string; targets: string }>;
};

export const careerAlphaInterviewAdapter = {
  id: "career-alpha-interview",
  runtime: "llm",
  responseSchemaName: "career_alpha_interview_output",
  buildMessages(input) {
    return { system: CAREER_ALPHA_INTERVIEW_SYSTEM_PROMPT, user: buildCareerInterviewPrompt(input) };
  },
  demo(input): InterviewRiskMap {
    // A conservative wiring demonstration, not a rule-based substitute for LLM judgment.
    const claim = String(input.resume).slice(0, 2000);
    const hasEvidence = typeof input.evidence === "string" && input.evidence.trim().length > 0;
    return {
      risks: [{
        claim,
        why_attackable: hasEvidence
          ? "Demo only: supplied evidence has not been independently verified. Check which artifact supports this claim, your personal contribution, and the stated project stage before using stronger wording. This is a preparation hypothesis, not a finding of dishonesty or a prediction of interviewer behavior."
          : "Demo only: no additional evidence was supplied. Identify one artifact supporting this claim and its ownership, measurement, and project-stage boundaries. Missing evidence does not establish dishonesty or lack of knowledge; this demo does not perform model-backed risk analysis.",
        action: "add_evidence",
      }],
      questions: [{
        question: "For this claim, what did you personally do, what did teammates or AI tools do, and which artifact supports that division of work?",
        targets: claim,
      }, {
        question: "Which result or project stage can you support with the supplied material, and what remains unverified?",
        targets: claim,
      }],
    };
  },
} satisfies LlmSkillAdapter;
