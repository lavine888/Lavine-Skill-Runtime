import Ajv2020 from "ajv/dist/2020";

import manifestSchema from "./manifest.schema.json";
import { validateSchemaContract } from "./schema";
import type { SkillDefinition, SkillManifest } from "./types";

const manifestAjv = new Ajv2020({ allErrors: true, strict: false });
const validateManifestSchema = manifestAjv.compile(manifestSchema);

export function assertValidManifest(manifest: SkillManifest) {
  const valid = validateManifestSchema(manifest);
  if (!valid) {
    const detail = validateManifestSchema.errors
      ?.map((error) => `${error.instancePath || "/"} ${error.message}`)
      .join("; ");
    throw new Error(`Invalid skill manifest ${manifest.id || "<unknown>"}: ${detail}`);
  }
}

export function buildRegistry(definitions: SkillDefinition[]) {
  const registry = new Map<string, SkillDefinition>();

  for (const definition of definitions) {
    const { manifest, adapter } = definition;
    assertValidManifest(manifest);
    validateSchemaContract(definition.inputSchema);
    validateSchemaContract(definition.outputSchema);

    const id = manifest.id;
    if (registry.has(id)) throw new Error(`Duplicate skill id: ${id}`);
    if (adapter.id !== id) {
      throw new Error(`Adapter id mismatch for ${id}: received ${adapter.id}`);
    }
    if (manifest.runtime.adapter !== adapter.id) {
      throw new Error(
        `Manifest adapter mismatch for ${id}: expected ${manifest.runtime.adapter}`,
      );
    }
    if (manifest.runtime.type !== adapter.runtime) {
      throw new Error(
        `Runtime mismatch for ${id}: manifest=${manifest.runtime.type}, adapter=${adapter.runtime}`,
      );
    }

    registry.set(id, definition);
  }

  return registry;
}
