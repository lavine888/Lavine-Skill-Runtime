import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RuntimeError } from "../errors";
import { logEvent } from "../log";
import type { RunnerExecution, SkillDefinition, SkillRunner } from "../types";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function pythonBinary() {
  return process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
}

/**
 * Skills live in the repository checkout, which is not part of the Next.js
 * build output. Resolve relative to this module first so execution does not
 * depend on the server's current working directory, then fall back to cwd.
 * SKILLS_DIR overrides both for standalone/container deployments.
 */
function skillsRoot() {
  const override = process.env.SKILLS_DIR;
  if (override) return path.resolve(override);

  const moduleRelative = path.resolve(moduleDir, "..", "..", "skills");
  if (existsSync(moduleRelative)) return moduleRelative;

  return path.resolve(process.cwd(), "skills");
}

function safeEntrypoint(skill: SkillDefinition) {
  if (skill.manifest.runtime.type !== "python") {
    throw new RuntimeError(
      "RUNNER_UNAVAILABLE",
      `Skill ${skill.manifest.id} does not declare a Python runtime.`,
      { httpStatus: 500 },
    );
  }

  const skillDir = path.resolve(skillsRoot(), skill.manifest.id);
  const entrypoint = path.resolve(skillDir, skill.manifest.runtime.entrypoint);
  if (entrypoint !== skillDir && !entrypoint.startsWith(`${skillDir}${path.sep}`)) {
    throw new RuntimeError("EXECUTION_FAILED", "Python entrypoint escapes the Skill directory.", {
      httpStatus: 500,
    });
  }

  return { skillDir, entrypoint };
}

function pythonEnv() {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: process.env.NODE_ENV || "production",
    PYTHONUTF8: "1",
    PYTHONDONTWRITEBYTECODE: "1",
  };

  for (const key of ["PATH", "SystemRoot", "WINDIR", "LANG", "LC_ALL"] as const) {
    if (process.env[key]) env[key] = process.env[key];
  }

  return env;
}

export const pythonRunner: SkillRunner = {
  type: "python",
  async execute(skill, input, context): Promise<RunnerExecution> {
    if (skill.adapter.runtime !== "python") {
      throw new RuntimeError(
        "RUNNER_UNAVAILABLE",
        `Skill ${skill.manifest.id} does not provide a Python adapter.`,
        { httpStatus: 500 },
      );
    }

    const { skillDir, entrypoint } = safeEntrypoint(skill);
    const maxBytes = skill.manifest.limits.max_output_bytes;

    return await new Promise<RunnerExecution>((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      let settled = false;

      const child = spawn(pythonBinary(), [entrypoint], {
        cwd: skillDir,
        env: pythonEnv(),
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
        signal: context.signal,
      });

      const finishReject = (error: unknown) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      child.on("error", (error) => {
        const candidate = error as NodeJS.ErrnoException;
        if (candidate.code === "ENOENT") {
          finishReject(
            new RuntimeError(
              "RUNNER_UNAVAILABLE",
              `Python executable not found: ${pythonBinary()}`,
              { retryable: false, httpStatus: 503, cause: error },
            ),
          );
          return;
        }
        if (candidate.name === "AbortError") {
          finishReject(
            new RuntimeError("EXECUTION_TIMEOUT", "Python execution was aborted.", {
              retryable: true,
              httpStatus: 504,
              cause: error,
            }),
          );
          return;
        }
        finishReject(
          new RuntimeError("EXECUTION_FAILED", candidate.message, {
            retryable: false,
            httpStatus: 500,
            cause: error,
          }),
        );
      });

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
        if (Buffer.byteLength(stdout, "utf8") > maxBytes) {
          child.kill();
          finishReject(
            new RuntimeError(
              "OUTPUT_TOO_LARGE",
              `Python stdout exceeded ${maxBytes} bytes.`,
              { httpStatus: 500 },
            ),
          );
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
        if (Buffer.byteLength(stderr, "utf8") > 65536) {
          stderr = `${stderr.slice(0, 65536)}\n[stderr truncated]`;
        }
      });

      child.on("close", (code, signal) => {
        if (settled) return;
        if (code !== 0) {
          // Diagnostics stay in the server-side log; the client-facing error
          // must not echo subprocess stderr, which may contain input echoes
          // or filesystem paths.
          logEvent("runner.python.stderr", {
            skill_id: skill.manifest.id,
            exit_code: code,
            signal: signal || null,
            stderr_bytes: Buffer.byteLength(stderr, "utf8"),
            stderr_preview: stderr.trim().slice(0, 1000) || null,
          });
          finishReject(
            new RuntimeError(
              "EXECUTION_FAILED",
              `Python process exited with code ${String(code)}${signal ? ` (${signal})` : ""}. See server logs for diagnostics.`,
              { retryable: false, httpStatus: 500 },
            ),
          );
          return;
        }

        try {
          const output = JSON.parse(stdout);
          settled = true;
          resolve({
            output,
            runner: "python",
            provider: "local-subprocess",
            model: pythonBinary(),
          });
        } catch (error) {
          finishReject(
            new RuntimeError("OUTPUT_INVALID", "Python runner returned invalid JSON.", {
              retryable: false,
              httpStatus: 500,
              cause: error,
            }),
          );
        }
      });

      child.stdin.end(JSON.stringify(input));
    });
  },
};
