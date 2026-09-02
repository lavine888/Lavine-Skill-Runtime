import Ajv2020 from "ajv/dist/2020";
import { RuntimeError } from "./errors";

const ajv = new Ajv2020({ allErrors: true, strict: false });

export function validateSchemaContract(schema: Record<string, unknown>) {
  ajv.compile(schema);
}

export function validateValue(
  schema: Record<string, unknown>,
  value: unknown,
  kind: "input" | "output" = "input",
) {
  const validator = ajv.compile(schema);
  const valid = validator(value);
  if (!valid) {
    const message = validator.errors
      ?.map((error) => `${error.instancePath || "/"} ${error.message}`)
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
