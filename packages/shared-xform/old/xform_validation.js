"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSpecYaml = validateSpecYaml;
exports.validateSpecObject = validateSpecObject;
// xform_validation.ts
const xform_schema_1 = require("./xform_schema");
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default({ allErrors: true, strict: false });
const validate = ajv.compile(xform_schema_1.TRANSFORM_JSON_SCHEMA);
function validateSpecYaml(yamlText) { }
function validateSpecObject(obj) { }
function formatAjvError(e) { }
