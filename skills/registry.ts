import type { SkillDefinition, SkillManifest } from "../runtime/types";

import proofManifest from "./career-alpha-proof/manifest.json";
import proofInputSchema from "./career-alpha-proof/input.schema.json";
import proofOutputSchema from "./career-alpha-proof/output.schema.json";
import { careerProofAdapter } from "./career-alpha-proof/adapter";

import positionManifest from "./career-alpha-position/manifest.json";
import positionInputSchema from "./career-alpha-position/input.schema.json";
import positionOutputSchema from "./career-alpha-position/output.schema.json";
import { careerPositionAdapter } from "./career-alpha-position/adapter";

import buffettManifest from "./buffett-moat-rule-check/manifest.json";
import buffettInputSchema from "./buffett-moat-rule-check/input.schema.json";
import buffettOutputSchema from "./buffett-moat-rule-check/output.schema.json";
import { buffettMoatRuleCheckAdapter } from "./buffett-moat-rule-check/adapter";

export const skillDefinitions: SkillDefinition[] = [
  {
    manifest: proofManifest as SkillManifest,
    inputSchema: proofInputSchema as Record<string, unknown>,
    outputSchema: proofOutputSchema as Record<string, unknown>,
    adapter: careerProofAdapter,
  },
  {
    manifest: positionManifest as SkillManifest,
    inputSchema: positionInputSchema as Record<string, unknown>,
    outputSchema: positionOutputSchema as Record<string, unknown>,
    adapter: careerPositionAdapter,
  },
  {
    manifest: buffettManifest as SkillManifest,
    inputSchema: buffettInputSchema as Record<string, unknown>,
    outputSchema: buffettOutputSchema as Record<string, unknown>,
    adapter: buffettMoatRuleCheckAdapter,
  },
];
