// xform_validation.ts
// Validation helpers for transform specs using AJV and YAML

import { TRANSFORM_JSON_SCHEMA, TransformSpec } from './xform_schema';
import Ajv, { ErrorObject } from 'ajv';
// Register JSON Schema draft-2020-12 meta-schema so AJV can validate schemas
import yaml from 'yaml';

const ajv = new Ajv({ allErrors: true, strict: false });
import addMetaSchema2020 from 'ajv/dist/refs/json-schema-2020-12';

// add the draft-2020-12 meta-schema (TRANSFORM_JSON_SCHEMA references it)
addMetaSchema2020.call(ajv, false as any);
const validate = ajv.compile(TRANSFORM_JSON_SCHEMA as any);

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
