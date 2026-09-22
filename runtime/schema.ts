import Ajv2020 from "ajv/dist/2020";
import { RuntimeError } from "./errors";

const ajv = new Ajv2020({ allErrors: true, strict: false });

/**
 * Compiled validators are cached per schema object reference. Registry schemas
 * are stable module imports, so compile cost is paid once per Skill contract
 * instead of on every input/output validation.
 */
type CompiledValidator = { (data: unknown): boolean; errors?: unknown[] | null };

const compiledValidators = new WeakMap<object, CompiledValidator>();

function getValidator(schema: Record<string, unknown>): CompiledValidator {
  let validator = compiledValidators.get(schema);
  if (!validator) {
    validator = ajv.compile(schema) as unknown as CompiledValidator;
    compiledValidators.set(schema, validator);
  }
  return validator;
}

export function validateSchemaContract(schema: Record<string, unknown>) {
  getValidator(schema);
}

export function validateValue(
  schema: Record<string, unknown>,
  value: unknown,
  kind: "input" | "output" = "input",
) {
  const validator = getValidator(schema);
  const valid = validator(value);
  if (!valid) {
    const message = validator.errors
      ?.map((error) => `${(error as { instancePath?: string; message?: string }).instancePath || "/"} ${(error as { message?: string }).message}`)
      .join("; ");
    throw new RuntimeError(
      kind === "input" ? "INPUT_INVALID" : "OUTPUT_INVALID",
      `Schema validation failed: ${message || "invalid value"}`,
      {
        retryable: false,
        httpStatus: kind === "input" ? 400 : 500,
      },
    );
  }
}
