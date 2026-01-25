// xform_validation.ts
import { TRANSFORM_JSON_SCHEMA, TransformSpec } from './xform_schema';
import Ajv, { ErrorObject } from 'ajv';
import yaml from 'yaml';
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(TRANSFORM_JSON_SCHEMA);
export function validateSpecYaml(yamlText: string) { return { ok: false, errors: ['validation not implemented'] }; }
export function validateSpecObject(obj: unknown) { return { ok: false, errors: ['validation not implemented'] }; }
function formatAjvError(e: ErrorObject): string { return typeof e === 'string' ? e : JSON.stringify(e); }
