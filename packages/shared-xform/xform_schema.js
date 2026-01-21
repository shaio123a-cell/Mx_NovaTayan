"use strict";
// xform_schema.ts
// JSON Schema and TypeScript types for the transformation DSL
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSFORM_JSON_SCHEMA = void 0;
exports.TRANSFORM_JSON_SCHEMA = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "TransformSpec",
    type: "object",
    required: ["version", "name", "input", "output", "mappings"],
    properties: {
        version: { type: "integer", const: 1 },
        name: { type: "string", minLength: 1 },
        input: {
            type: "object",
            required: ["type", "root"],
            properties: {
                type: { type: "string", enum: ["json", "xml", "html"] },
                root: { type: "string", minLength: 1 }
            },
            additionalProperties: false
        },
        output: {
            type: "object",
            required: ["type"],
            properties: {
                type: { type: "string", enum: ["csv", "json", "xml", "text"] },
                options: {
                    type: "object",
                    properties: {
                        header: { type: "boolean" },
                        delimiter: { type: "string", minLength: 1, maxLength: 1 }
                    },
                    additionalProperties: true
                }
            },
            additionalProperties: false
        },
        mappings: {
            type: "array",
            minItems: 1,
            items: {
                type: "object",
                properties: {
                    name: { type: "string", minLength: 1 },
                    expr: { type: "string", minLength: 1 },
                    type: { type: "string", enum: ["string", "number", "boolean", "date", "any"] }
                },
                required: ["name", "expr"],
                additionalProperties: false
            }
        },
        filters: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    expr: { type: "string", minLength: 1 }
                },
                required: ["expr"],
                additionalProperties: false
            }
        },
        defaults: {
            type: "object",
            properties: {
                on_missing: { type: "string", enum: ["null", "skip_row", "error"] }
            },
            additionalProperties: false
        },
        parameters: {
            description: "Optional declaration of variables expected at runtime",
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string", pattern: "^[A-Za-z_][A-Za-z0-9_]*$" },
                    type: { type: "string", enum: ["string", "number", "boolean", "any"] },
                    required: { type: "boolean", default: false },
                    default: {}
                },
                required: ["name"],
                additionalProperties: false
            }
        }
    },
    additionalProperties: false
};
