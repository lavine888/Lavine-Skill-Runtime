#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const root = process.cwd();
const skillsRoot = path.join(root, "skills");
const manifestSchema = JSON.parse(
  await readFile(path.join(root, "runtime", "manifest.schema.json"), "utf8"),
);
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateManifest = ajv.compile(manifestSchema);

async function skillDirectories() {
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function loadJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function inspectSkill(id) {
  const dir = path.join(skillsRoot, id);
  const manifest = await loadJson(path.join(dir, "manifest.json"));
  const inputSchema = await loadJson(path.join(dir, "input.schema.json"));
  const outputSchema = await loadJson(path.join(dir, "output.schema.json"));

  const errors = [];
  if (!validateManifest(manifest)) {
    errors.push(
      ...(validateManifest.errors || []).map(
        (error) => `manifest${error.instancePath || "/"} ${error.message}`,
      ),
    );
  }

  try {
    ajv.compile(inputSchema);
  } catch (error) {
    errors.push(`input.schema.json ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    ajv.compile(outputSchema);
  } catch (error) {
    errors.push(`output.schema.json ${error instanceof Error ? error.message : String(error)}`);
  }

  if (manifest.id !== id) errors.push(`directory id ${id} does not match manifest id ${manifest.id}`);
  return { id, manifest, errors };
}

async function listSkills() {
  for (const id of await skillDirectories()) {
    const { manifest, errors } = await inspectSkill(id);
    const status = errors.length ? "INVALID" : "OK";
    console.log(
      `${status.padEnd(7)} ${id.padEnd(30)} ${String(manifest.runtime?.type || "?").padEnd(8)} ${manifest.source?.repo || "?"}@${String(manifest.source?.commit || "").slice(0, 8)}`,
    );
  }
}

async function validateSkills() {
  let invalid = 0;
  for (const id of await skillDirectories()) {
    const result = await inspectSkill(id);
    if (result.errors.length === 0) {
      console.log(`✓ ${id}`);
      continue;
    }

    invalid += 1;
    console.error(`✗ ${id}`);
    for (const error of result.errors) console.error(`  - ${error}`);
  }

  if (invalid) {
    console.error(`\n${invalid} skill contract(s) invalid.`);
    process.exitCode = 1;
  } else {
    console.log("\nAll skill contracts are valid.");
  }
}

function llmAdapterTemplate(id) {
  const symbol = id
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[a-z]/, (letter) => letter.toLowerCase());

  return [
    'import type { SkillAdapter } from "../../runtime/types";',
    "",
    `export const ${symbol}Adapter: SkillAdapter = {`,
    `  id: "${id}",`,
    '  runtime: "llm",',
    `  responseSchemaName: "${id.replaceAll("-", "_")}_output",`,
    "  buildMessages(input) {",
    "    return {",
    '      system: "Follow the reviewed Skill contract. Return only schema-valid JSON.",',
    "      user: JSON.stringify(input),",
    "    };",
    "  },",
    "  demo(input) {",
    `    return { summary: "Demo output for ${id}: " + JSON.stringify(input) };`,
    "  },",
    "};",
    "",
  ].join("\n");
}

async function initSkill(args) {
  const [id, repo, sourcePath, commit, runtime = "llm"] = args;
  if (!id || !repo || !sourcePath || !commit) {
    throw new Error(
      "Usage: npm run skill:init -- <id> <owner/repo> <source-path> <40-char-commit> [llm|python|image]",
    );
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("Skill id must be kebab-case.");
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error("Source commit must be a 40-character lowercase SHA.");
  if (!["llm", "python", "image"].includes(runtime)) throw new Error("Unsupported runtime type.");

  const dir = path.join(skillsRoot, id);
  await mkdir(dir, { recursive: false });

  const runtimeSpec =
    runtime === "python"
      ? { type: "python", adapter: id, entrypoint: "runner.py" }
      : runtime === "image"
        ? { type: "image", adapter: id }
        : { type: "llm", adapter: id };

  const manifest = {
    schema_version: "1.0",
    id,
    name: id.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
    description: "Replace this description with the reviewed Skill outcome and contract.",
    version: "0.1.0",
    source: { repo, path: sourcePath, ref: "main", commit },
    runtime: runtimeSpec,
    input_schema: "./input.schema.json",
    output_schema: "./output.schema.json",
    artifacts: ["json"],
    limits: {
      timeout_seconds: 120,
      max_input_bytes: 262144,
      max_output_bytes: 1048576,
      max_concurrency: 2,
      max_artifacts: 8,
    },
    tags: [],
  };

  const inputSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: `${manifest.name} Input`,
    type: "object",
    additionalProperties: false,
    required: ["input"],
    properties: {
      input: { type: "string", minLength: 1, title: "Input" },
    },
  };
  const outputSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: `${manifest.name} Output`,
    type: "object",
    additionalProperties: false,
    required: ["summary"],
    properties: {
      summary: { type: "string" },
    },
  };

  await writeFile(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(dir, "input.schema.json"), `${JSON.stringify(inputSchema, null, 2)}\n`);
  await writeFile(path.join(dir, "output.schema.json"), `${JSON.stringify(outputSchema, null, 2)}\n`);
  if (runtime === "llm") await writeFile(path.join(dir, "adapter.ts"), llmAdapterTemplate(id));

  console.log(`Created ${path.relative(root, dir)}.`);
  console.log("Review the generated contract, add the adapter for non-LLM runtimes, then register it in skills/registry.ts.");
}

const [command = "list", ...args] = process.argv.slice(2);

try {
  if (command === "list") await listSkills();
  else if (command === "validate") await validateSkills();
  else if (command === "init") await initSkill(args);
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
