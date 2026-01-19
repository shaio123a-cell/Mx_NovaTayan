// xform_validation.ts
import { TRANSFORM_JSON_SCHEMA, TransformSpec } from './xform_schema';
import Ajv, { ErrorObject } from 'ajv';
import yaml from 'yaml';
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(TRANSFORM_JSON_SCHEMA);
export function validateSpecYaml(yamlText: string) { /* ...as previously generated... */ }
export function validateSpecObject(obj: unknown) { /* ...as previously generated... */ }
function formatAjvError(e: ErrorObject): string { /* ...as previously generated... */ }
