import type { SkillAdapter } from "../../runtime/types";
import {
  buildCareerPositionPrompt,
  CAREER_ALPHA_POSITION_SYSTEM_PROMPT,
} from "./prompt";

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export const careerPositionAdapter: SkillAdapter = {
  id: "career-alpha-position",
  responseSchemaName: "career_positioning",
  buildMessages(input) {
    return {
      system: CAREER_ALPHA_POSITION_SYSTEM_PROMPT,
      user: buildCareerPositionPrompt({
        target_role: text(input.target_role),
        current_material: text(input.current_material),
        job_description: text(input.job_description) || undefined,
        channel: text(input.channel) || undefined,
      }),
    };
  },
  demo(input) {
    const role = text(input.target_role);
    const material = text(input.current_material);
    const channel = text(input.channel) || "resume";
    const snippet = material.slice(0, 180);

    return {
      positioning: {
        safe: `${role} candidate with hands-on project evidence that can be described without inflating title, scale, or ownership.`,
        strong: `${role} candidate with evidence-first positioning around the strongest repeated capability in the supplied work.`,
        future: `${role} profile with stronger external validation after one additional high-signal proof point is completed.`,
      },
      resume_summary: `Evidence-first ${role} candidate. Current positioning should center on the strongest directly supportable project or delivery capability rather than broad seniority claims.`,
      bullets: [
        {
          text: snippet || `Built work relevant to ${role} and documented the resulting artifact.`,
          confidence: "SELF-REPORTED",
          note: "Demo mode does not independently verify the supplied material. Use /proof to raise confidence before using stronger wording.",
        },
      ],
      channel_pack: {
        opener: `I’m targeting ${role} roles and have been building evidence around the underlying workflow rather than only rewriting my resume.`,
        intro: `I’m focused on ${role}. My current work is strongest where I can point to concrete artifacts and explain the decisions, tradeoffs, and delivery boundaries behind them.`,
        founder_dm: `I’m exploring ${role} opportunities. I’ve been building hands-on proof around the problems behind the role, and I’d rather share a concrete artifact than send a generic pitch.`,
      },
      evidence_gaps: [
        {
          capability: `Core ${role} capability`,
          gap: `Current material is not independently verified in ${channel} mode.`,
          next_action: "Attach one direct artifact such as a shipped demo, PR, benchmark, decision doc, or external result to the strongest claim.",
          recommended_skill: "/proof",
        },
      ],
      claim_audit_notes: [
        "Keep current title and scope aligned with directly supportable evidence.",
        "Do not convert future positioning into a present-tense headline.",
      ],
      next_skill: "/proof",
    };
  },
};
