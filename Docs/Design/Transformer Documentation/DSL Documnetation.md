2) DSL Reference Document (ship this in your Help panel)

Title: Transformation DSL (v1) — Quick Reference

Overview
A declarative YAML spec that tells the engine how to transform input data (JSON, XML, HTML) into CSV/JSON/XML/Text. Execution is deterministic and sandboxed. Expressions use JMESPath (JSON), XPath (XML), and CSS selectors with text ops (HTML). Runtime variables are supported via {{var}}.
Top-level keys

version (int, required): must be 1.
name (string, required): unique transform name.
input (object, required)

type: json | xml | html
root: selector for rows

JSON → JMESPath (e.g., $.employees[]) must resolve to an array.
XML → XPath (e.g., //employee) returns a node set.
HTML → CSS selector (e.g., table#emp > tr:not(:first-child)).




output (object, required)

type: csv | json | xml | text
options (object, optional)

header (bool) — CSV header row (default: true)
delimiter (string, length=1) — CSV delimiter (default: ,)




mappings (array, required): fields/columns to emit

Each mapping:

name (string): output field/column name
expr (string): expression evaluated per row

JSON: JMESPath relative to the row object
XML: XPath relative to the current node
HTML: constrained path like "td:nth-child(2)/text()" from the current element


type (optional): string | number | boolean | date | any (coercion if supported)




filters (array, optional): keep rows only if all filter expressions evaluate truthy

expr (string): same expression language as mappings, relative to row.


defaults (object, optional):

on_missing: null | skip_row | error


parameters (array, optional): declare runtime variables

name (string): ^[A-Za-z_][A-Za-z0-9_]*$
type (optional): string | number | boolean | any
required (optional, bool)
default (optional, any)



Variables ({{var}})

Use in expr (mappings & filters): city == {{target_city}}, age >= {{min_age}}.
Unquoted placeholders are recommended; the engine inserts typed literals:

strings → "value" (JMESPath), quoted literal in XPath (or concat() if needed)
numbers → 42
booleans → true/false (JMESPath) or true()/false() (XPath)


Quoted placeholders also work: city == '{{target_city}}' → raw string is inserted (escaped).
Missing required variables cause an error unless parameters[].default is provided.

Expression Notes

JMESPath (JSON): field access (id, city), filters ([?age >= 30]), array ops.
XPath (XML): attributes (@id), text (name/text()), numeric conversion number(...).
HTML/CSS: select nodes with CSS; within expr, use relative paths like td:nth-child(2)/text() for cell text.

Output types

CSV: columns from mappings[].name, values from expr. RFC4180 escaping; header and delimiter configurable.
JSON: array of objects { [mapping.name]: value }.
Text: single mapping allowed. Values joined with \n.
XML: (if enabled) wrapper with rows and child elements per mapping.name.

Error handling

Invalid schema → validation error shown with line/key info.
JSON root not array → helpful error.
Missing mapping value:

null → empty cell/null
skip_row → entire row dropped
error → transformation fails with row+field context.



Best practices

Keep root array‑resolving.
Use variables for filters you expect to change at runtime.
Prefer unquoted {{var}} placeholders for type‑safe insertion.
Validate & preview before saving.
For nested arrays in JSON, use a [] path in root (e.g., $.orders[].lines[]).


──────────────────────────────────────────────────────────────────────────────
DSL SCHEMA (JSON Schema)
──────────────────────────────────────────────────────────────────────────────
File to create: `xform_schema.ts` exporting a constant `TRANSFORM_JSON_SCHEMA` (object literal).

Schema (same as before with variables and parameters):

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TransformSpec",
  "type": "object",
  "required": ["version", "name", "input", "output", "mappings"],
  "properties": {
    "version": { "type": "integer", "const": 1 },
    "name": { "type": "string", "minLength": 1 },
    "input": {
      "type": "object",
      "required": ["type", "root"],
      "properties": {
        "type": { "type": "string", "enum": ["json", "xml", "html"] },
        "root": { "type": "string", "minLength": 1 }
      },
      "additionalProperties": false
    },
    "output": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "type": "string", "enum": ["csv", "json", "xml", "text"] },
        "options": {
          "type": "object",
          "properties": {
            "header": { "type": "boolean" },
            "delimiter": { "type": "string", "minLength": 1, "maxLength": 1 }
          },
          "additionalProperties": true
        }
      },
      "additionalProperties": false
    },
    "mappings": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "minLength": 1 },
          "expr": { "type": "string", "minLength": 1 },   // may contain {{var}}
          "type": { "type": "string", "enum": ["string","number","boolean","date","any"] }
        },
        "required": ["name", "expr"],
        "additionalProperties": false
      }
    },
    "filters": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "expr": { "type": "string", "minLength": 1 }     // may contain {{var}}
        },
        "required": ["expr"],
        "additionalProperties": false
      }
    },
    "defaults": {
      "type": "object",
      "properties": {
        "on_missing": { "type": "string", "enum": ["null","skip_row","error"] }
      },
      "additionalProperties": false
    },
    "parameters": {
      "description": "Optional declaration of variables expected at runtime",
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "pattern": "^[A-Za-z_][A-Za-z0-9_]*$" },
          "type": { "type": "string", "enum": ["string","number","boolean","any"] },
          "required": { "type": "boolean", "default": false },
          "default": {}
        },
        "required": ["name"],
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
