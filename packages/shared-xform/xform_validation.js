"use strict";
// xform_validation.ts
// Validation helpers for transform specs using AJV and YAML
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSpecYaml = validateSpecYaml;
exports.validateSpecObject = validateSpecObject;
const xform_schema_1 = require("./xform_schema");
const ajv_1 = __importDefault(require("ajv"));
const yaml_1 = __importDefault(require("yaml"));
const ajv = new ajv_1.default({ allErrors: true, strict: false });
const validate = ajv.compile(xform_schema_1.TRANSFORM_JSON_SCHEMA);
function validateSpecYaml(yamlText) {
    let obj;
    try {
        obj = yaml_1.default.parse(yamlText);
    }
    catch (e) {
        return { ok: false, errors: ["YAML parse error: " + (e?.message || String(e))] };
    }
    return validateSpecObject(obj);
}
function validateSpecObject(obj) {
    const valid = validate(obj);
    if (valid) {
        return { ok: true, spec: obj };
    }
    else {
        return {
            ok: false,
            errors: (validate.errors || []).map(formatAjvError)
        };
    }
}
function formatAjvError(e) {
    return `${e.instancePath || ''} ${e.message || ''}`.trim();
}
