// xform_validation.ts
// Validation helpers for transform specs using AJV and YAML

import { TRANSFORM_JSON_SCHEMA, TransformSpec } from './xform_schema';
import Ajv, { ErrorObject } from 'ajv';
import yaml from 'yaml';

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(TRANSFORM_JSON_SCHEMA);

export function validateSpecYaml(yamlText: string): { ok: true; spec: TransformSpec } | { ok: false; errors: string[] } {
  let obj: unknown;
  try {
    obj = yaml.parse(yamlText);
  } catch (e: any) {
    return { ok: false, errors: ["YAML parse error: " + (e?.message || String(e))] };
  }
  return validateSpecObject(obj);
}

export function validateSpecObject(obj: unknown): { ok: true; spec: TransformSpec } | { ok: false; errors: string[] } {
  const valid = validate(obj);
  if (valid) {
    return { ok: true, spec: obj as TransformSpec };
  } else {
    return {
      ok: false,
      errors: (validate.errors || []).map(formatAjvError)
    };
  }
}

function formatAjvError(e: ErrorObject): string {
  return `${e.instancePath || ''} ${e.message || ''}`.trim();
}
