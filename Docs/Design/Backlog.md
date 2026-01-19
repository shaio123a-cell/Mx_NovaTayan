# Task Output Processing Tab 
- Add a new tab in the task definition (in the derawer / shelf) for task output processing. 
- The idea of output processing is to allow users to process the output of a task and to be able to use the output of a task as an input for another task. as well as to parse the data for further processing or usage either by the task iteself or by other tasks that follow in the same workflow or by other workflows.
- The output processing tab should provide the ability to create variables from the output of a task. The variables can either be local to task, or global to workflow or global to entire applicaiton to be used by other workflows (te default should be global to the workflow)
- Each variable can be defined by a name and a value. The value can be a static value or a dynamic value that is calculated based on the output of the task. The dynamic value can be calculated using tools we would provide for mutating the output of the task.
- variables created erailer in teh task or global variables created by other tasks (either global to the workflow or global to the app) should be available to use in the variables - for example if a local or global variable called - JWT_to_Salesforce was created it should be possible to use it as a value to write into another variable - either as oart of a larger string or as a value for a variable. 
- Local variables to task must have unique names
- Global variables in workflow should be unique in the entire workflow
- Global variables in application should be unique in the entire application
- To easen this task a variable that is global to workflow would automatically be predixed by the task name at which it was created. For example if a variable called - JWT_to_Salesforce was created it would be available as - TaskName.JWT_to_Salesforce
- A global variable created in the application level would be available as - WorkflowName.TaskName.JWT_to_Salesforce
- it should be possible search variable by name and to filter them by scope (local, workflow, application) 
- it should be possible to edit a variable - to change its name or to change its value or to change its scope but when doing so it should be checked that the variable is not used in any other task or workflow or application 
- if the variable is used by other tasks the app should popup a message that the variable is used by other tasks and ask if the user wants  to replace the variable name with the new name. when doing so it should check locally only for local variables, throuout the workflow for workflow variables and throughout the application for application variables
- to extract data from the output of a task the app should provide a set of tools that allow the user to extract data from the output of a task. for example using regex or using jsonpath or using xpath or using css selectors or using xsl or j
 - also want to have tools for mutating the variables to a different format - fir example json format, xml format, csv forrmat, text format etc. 

# Variables mutation AI Agent 
- I want to have the option to configure in the administration of the app hte connection to a gpt or mcp (you would need to help me to decide what i need accroding to the following needs ) - the idea is to have an AI agent that can mutate the variables to a different format based on the output of the task and desired format and example of the format desired 
- as said before the variables can  be static value or dynamic mapping if checkmark dynamic mapping i suggest the following solution to provide the ability to manage the dynamic mapping 

You are a senior platform engineer implementing a deterministic data transformation engine
with an optional AI-assist layer. The engine converts API outputs (JSON / XML / HTML)
into other formats (CSV / JSON / XML / Text) using a small, auditable DSL (YAML).
AI assist is for design-time only; runtime execution is deterministic and sandboxed.

IMPORTANT CONSTRAINTS FOR THIS TASK
- DO NOT scaffold a new repository or create a project tree.
- DO NOT generate a CLI, binaries, or any global files.
- Produce ONLY self-contained modules and integration-ready snippets that can be pasted
  into an existing app without overwriting existing files.
- Prefix all suggested filenames with `xform_` to avoid collisions (e.g., `xform_engine.ts`).
- Provide import examples assuming the host app uses TypeScript + React (adjustable).
- Keep all functionality accessible via **programmatic API** + **React components**.

──────────────────────────────────────────────────────────────────────────────
PROJECT OVERVIEW
──────────────────────────────────────────────────────────────────────────────
Goal:
- Let users define transformations from JSON/XML/HTML → CSV/JSON/XML/Text using a compact DSL (YAML).
- Support selecting records (root path), mapping fields, filtering rows, type casts/defaults.
- Deterministic runtime engine (no arbitrary code). AI assist only generates the DSL spec + tests.
- Handle both “extract a key” and large nested JSON arrays (streaming-ready design).
- **Variable Support:** Orchestrator injects runtime variables using `{{var}}` placeholders inside expressions
  without regenerating the spec.

Primary runtime assumptions:
- TypeScript (Node 18+/Edge/Browser).
- React 18+ for preview UI (no global state assumptions).
- If a different stack is required, provide alternative snippets at the end.

──────────────────────────────────────────────────────────────────────────────
FUNCTIONAL REQUIREMENTS
──────────────────────────────────────────────────────────────────────────────
Inputs:
- JSON, XML, or HTML documents (string or ArrayBuffer/Buffer).
- Future (phase 2): NDJSON streaming path for large JSON.

DSL (YAML) core:
- input.type: json | xml | html
- input.root:
  - JSON: JMESPath (e.g., $.employees[])
  - XML: XPath (e.g., //employee)
  - HTML: CSS selector (e.g., table#emp > tbody > tr)
  Resolves to an array (rows/nodes).
- output.type: csv | json | xml | text
- output.options: format-specific (CSV header/delimiter).
- mappings: expressions evaluated per row/node.
  - CSV/JSON/XML: define fields (name + expr)
  - Text: single mapping allowed (expr yields scalar/string)
- filters: boolean expressions to keep rows (relative to each row/node).
- defaults: on_missing = null | skip_row | error
- (Phase 2) derive, explode.

**Variable Injection (`{{var}}`):**
- Allowed in `mappings[].expr` and `filters[].expr`.
- Orchestrator passes a variables map at runtime (e.g., `{ target_city: "Chicago", min_age: 30 }`).
- Interpolation must be **safe and typed** for each expression engine:
  - JMESPath (JSON): use JSON literals (`JSON.stringify` for strings).
  - XPath (XML): strings as `'...'` or `"..."`, and if both quote types occur, emit `concat('..',"..",'..')`.
  - CSS/HTML: string/text extraction paths should treat variables as string literals; do not enable arbitrary selectors.
- Recommended authoring style (no quotes around placeholders):
  - `city == {{target_city}}` → becomes `city == "Chicago"`
  - `age >= {{min_age}}` → becomes `age >= 30`
- If the DSL author intentionally quotes (`'{{target_city}}'`), insert raw string inside those quotes (escaped).

Validation & Safety:
- Validate DSL YAML with JSON Schema before execution.
- JSON root must resolve to an array; else error.
- Hard timeouts; depth/size caps; no arbitrary code.
- Placeholder name pattern: `^[A-Za-z_][A-Za-z0-9_]*$`.
- Missing required vars fail fast unless a default is present.
- Redact variable values in logs (log only names).

Outputs:
- CSV: header optional, delimiter configurable, RFC4180 escaping.
- JSON: array of objects.
- Text: newline-joined scalar values.
- XML: minimal wrapper root with child nodes per row (basic emitter in v1).

Integration:
- Provide a small **typed API** (programmatic).
- Provide a **React preview component** for the GUI that:
  - Accepts input text, spec YAML, and variables map.
  - Shows live preview (first N rows) and validation errors.
  - Does not persist or write files (host app handles persistence).

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

Export TypeScript types `TransformSpec`, `TransformInputType`, `TransformOutputType`.

──────────────────────────────────────────────────────────────────────────────
FILES / MODULES TO PRODUCE (NO TREE SCaffold)
──────────────────────────────────────────────────────────────────────────────
Create the following **standalone** files (you can place them anywhere in the host app). All imports must be explicit.

1) `xform_engine.ts`
   - Exports:
     - `transform(spec: TransformSpec, input: string|ArrayBuffer|Buffer, vars?: Record<string,unknown>, options?: { previewLimit?: number, timeoutMs?: number }): Promise<string|Uint8Array>`
     - `validateSpec(specYaml: string): { ok: true, spec: TransformSpec } | { ok: false, errors: string[] }`
     - `detectInputTypeFromSpec(spec: TransformSpec): 'json'|'xml'|'html'`
   - Responsibilities:
     1) Parse YAML → spec, validate against JSON Schema (AJV).
     2) Interpolate variables in `filters[].expr` and `mappings[].expr` using `xform_vars.ts`.
     3) Parse input per `input.type`.
     4) Select rows via root selector (JMESPath/XPath/CSS).
     5) Apply filters (post-interpolation).
     6) Build records via mappings; type coerce if `mappings[].type` provided.
     7) Apply defaults (null/skip_row/error).
     8) Render output (CSV/JSON/Text/XML) and return as string/Uint8Array.
     9) Enforce timeout & size limits (abortable via `AbortSignal` if easy).

2) `xform_selectors_json.ts`
   - JMESPath evaluation helpers:
     - `selectRows(doc: any, rootExpr: string): any[]`
     - `evalExpr(row: any, expr: string): any`
     - Use `jmespath` lib; throw helpful errors when root not array.

3) `xform_selectors_xml.ts`
   - XPath helpers using `xmldom` + `xpath` (or `libxmljs2` if preferred):
     - `selectNodes(xmlDoc: Document, rootXPath: string): Node[]`
     - `evalXPath(node: Node, expr: string): string|number|boolean|Node|Node[]`
     - Restrict to node-local relative queries where applicable.

4) `xform_selectors_html.ts`
   - HTML helpers using `cheerio`:
     - `selectNodes($: CheerioAPI, rootCss: string): CheerioElement[]`
     - `evalRelative($row: Cheerio, expr: string): string|number|boolean`
     - Constrain to text extraction paths like `td:nth-child(2)/text()`; no dynamic selector eval from variables.

5) `xform_renderers.ts`
   - Functions:
     - `renderCSV(rows: Record<string,unknown>[], columns: string[], opts: { header?: boolean, delimiter?: string }): string`
     - `renderJSON(rows: Record<string,unknown>[]): string`
     - `renderText(values: (string|number|boolean|null|undefined)[]): string`
     - `renderXML(rows: Record<string,unknown>[], rootName?: string, rowName?: string): string` (basic, safe escaping)

6) `xform_vars.ts`
   - Safe variable interpolation:
     - `interpolateExpr(expr: string, vars: Record<string,unknown>, engine: 'jmespath'|'xpath'|'css'): string`
     - Rules:
       * Placeholder pattern: `{{var}}`.
       * Detect quoted vs unquoted context.
       * JMESPath: strings via JSON.stringify; numbers/booleans/null as literals.
       * XPath: string literals as `'...'` or `"..."`; if both quotes exist → `concat(...)`. Booleans as `true()`/`false()`.
       * CSS mode: only allow inside text comparisons; treat as string literals, no selector injection.
       * Coerce types based on `spec.parameters[].type` if provided; error on invalid coercion.
       * Reject missing required vars; allow defaults from `parameters`.
       * Redact values in logs; include var names only.

7) `xform_validation.ts`
   - AJV setup using `TRANSFORM_JSON_SCHEMA` from `xform_schema.ts`.
   - Exports `validateSpecYaml(yaml: string)` and `validateSpecObject(obj: unknown)`.

8) `xform_preview.react.tsx`
   - React component: `<XformPreview specYaml: string; inputText: string; vars?: Record<string,unknown>; limit?: number; onError?: (e: Error) => void />`
   - Renders:
     - A summary (rows count preview, columns).
     - A table/grid for CSV/JSON outputs (first N rows only).
     - Error panel showing validation and interpolation errors clearly.
   - No styling assumptions (minimal inline styles or classNames props).

9) `xform_examples.ts` (for dev/demo; optional to ship)
   - Contains your `employees` JSON and example specs (with variables) as strings for quick smoke tests.

10) `xform_tests.md` (host app can port to its test framework)
   - Test cases described (inputs, expected outputs) for quick manual verification.

Dependencies (peer guidance; do NOT install, just import-friendly code):
- `yaml` (parse)
- `ajv` (JSON Schema)
- `jmespath`
- `xmldom`, `xpath`
- `cheerio`

──────────────────────────────────────────────────────────────────────────────
EXAMPLE SPECS (strings for docs/demos)
──────────────────────────────────────────────────────────────────────────────
A) JSON → CSV (with vars)
---
version: 1
name: employees_to_csv_with_vars
input:
  type: json
  root: $.employees[]
output:
  type: csv
  options:
    header: true
mappings:
  - name: id
    expr: id
    type: number
  - name: name
    expr: name
  - name: city
    expr: city
filters:
  - expr: age >= {{min_age}}
  - expr: city == {{target_city}}
defaults:
  on_missing: null
parameters:
  - name: min_age
    type: number
    required: true
  - name: target_city
    type: string
    required: true

Expected with vars `{ min_age: 30, target_city: "Chicago" }`:
id,name,city
103,Marcus Miller,Chicago

B) JSON → Text (extract token)
---
version: 1
name: extract_access_token
input:
  type: json
  root: $
output:
  type: text
mappings:
  - name: access_token
    expr: access_token
defaults:
  on_missing: error

C) XML → CSV (with vars)
---
version: 1
name: xml_employees_to_csv_with_vars
input:
  type: xml
  root: //employee
output:
  type: csv
  options:
    header: true
mappings:
  - name: id
    expr: @id
  - name: name
    expr: name/text()
  - name: city
    expr: city/text()
filters:
  - expr: number(age/text()) >= {{min_age}}
  - expr: city/text() = {{target_city}}
parameters:
  - name: min_age
    type: number
    required: true
  - name: target_city
    type: string
    required: true

──────────────────────────────────────────────────────────────────────────────
PROGRAMMATIC API (EMBED-ONLY)
──────────────────────────────────────────────────────────────────────────────
Usage example (TypeScript):

import { transform, validateSpec } from './xform_engine';

const specYaml = `...`;      // from user workspace (GUI)
const inputText = `...`;     // REST response or file content
const vars = { min_age: 30, target_city: 'Chicago' };

const { ok, spec, errors } = validateSpec(specYaml);
if (!ok) { /* show errors in UI */ }

// Preview first 10 rows (GUI)
const preview = await transform(spec!, inputText, vars, { previewLimit: 10 });

// Full transform (GUI action)
const result = await transform(spec!, inputText, vars);

Render `result` in the UI or offer download—no filesystem writes in engine.

──────────────────────────────────────────────────────────────────────────────
REACT PREVIEW COMPONENT
──────────────────────────────────────────────────────────────────────────────
Requirements for `<XformPreview />`:
- Props: specYaml, inputText, vars?, limit?, onError?
- Internally calls `validateSpec(specYaml)` and `transform(spec, inputText, vars, { previewLimit: limit ?? 20 })`.
- Displays:
  - Valid/invalid badge with details.
  - A small grid (first N rows or a JSON viewer).
  - Errors/warnings with line numbers when possible.
- No persistence or routing; purely presentational.

──────────────────────────────────────────────────────────────────────────────
TESTS TO DESCRIBE (xform_tests.md)
──────────────────────────────────────────────────────────────────────────────
1) Spec validation: unknown keys rejected; required fields enforced.
2) JSON → CSV with variables (min_age=30, target_city="Chicago") matches expected.
3) JSON minimal transform: returns array of 4 objects with expected fields.
4) Token extract: returns raw token in text output; missing token raises error if on_missing=error.
5) XPath variable interpolation with quotes inside values uses concat() safely.
6) Type coercion based on parameters: `"30"` → 30; invalid numeric input throws.
7) CSV escaping: commas, quotes, newlines; delimiter override to semicolon.
8) Expression length caps and timeouts enforced with graceful errors.

(Phase 2)
9) NDJSON streaming path with variables in filters runs without OOM.

──────────────────────────────────────────────────────────────────────────────
AI ASSIST (Design-time only) — INTERNAL PROMPT TEMPLATE
──────────────────────────────────────────────────────────────────────────────
Create a helper (no runtime dependency in engine). Given input sample + intent, produce:
- A valid YAML spec conforming to the schema.
- A mock preview (first 5 rows), no remote calls.

If user mentions runtime parameters (e.g., 'target_city'), include them in `parameters`
with types/defaults. Ensure root resolves to an array. Use JMESPath/XPath/CSS accordingly.

Return ONLY:
1) YAML spec
2) A markdown code block titled "Preview (first 5 rows)" showing expected shape.

──────────────────────────────────────────────────────────────────────────────
DELIVERABLES
──────────────────────────────────────────────────────────────────────────────
- `xform_engine.ts`, `xform_schema.ts`, `xform_validation.ts`
- `xform_selectors_json.ts`, `xform_selectors_xml.ts`, `xform_selectors_html.ts`
- `xform_renderers.ts`, `xform_vars.ts`
- `xform_preview.react.tsx`
- `xform_examples.ts` (optional for dev/demo)
- `xform_tests.md` with copyable cases

Constraints:
- Deterministic; no eval; no network calls in engine.
- Clear error messages (include mapping/filter name, row index where relevant).
- Never log variable values; only names and required/optional status.
- Keep modules small, typed, and easy to drop into an existing app.

