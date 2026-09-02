import { spawn } from "node:child_process";
import path from "node:path";

import { RuntimeError } from "../errors";
import type { RunnerExecution, SkillDefinition, SkillRunner } from "../types";

function pythonBinary() {
  return process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
}

function safeEntrypoint(skill: SkillDefinition) {
  if (skill.manifest.runtime.type !== "python") {
    throw new RuntimeError(
      "RUNNER_UNAVAILABLE",
      `Skill ${skill.manifest.id} does not declare a Python runtime.`,
      { httpStatus: 500 },
    );
  }

  const skillDir = path.resolve(process.cwd(), "skills", skill.manifest.id);
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
          finishReject(
            new RuntimeError(
              "EXECUTION_FAILED",
              `Python process exited with code ${String(code)}${signal ? ` (${signal})` : ""}${stderr.trim() ? `: ${stderr.trim()}` : ""}`,
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
