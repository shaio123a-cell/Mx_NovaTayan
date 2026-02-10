Variables Management - MD

# A) Variable Syntax & Resolution when using inside different places (e.g. task : payload, body, url, security setting etc.) 
- Default: unqualified name with closest-scope precedence → {{var}}
  - Precedence of taking var value : task → workflow (per execution) → global → macros → literal
- Explicit global override (only when needed): {{global.var}}
- Macros (read-only): {{now}}, {{epoch}}, {{epochMs}}, {{uuid}}, {{env}}, {{appVer}}, {{region}}, {{HTTP.<taskName>.status}}, {{HTTP.<taskName>.body.token}}, {{HTTP.last.body}}
- Helpers (pipe syntax): {{ value | upper }}, {{ payload | jsonPath:$.token }}, {{ coalesce:jwt,defaultJwt }}, {{ toJson:obj }}, {{ fromJson:str }}, {{ base64enc:x }}, {{ urlenc:x }}, {{ sha256:x }}
- Composition supported in strings and JSON. Auto-stringify only when destination is a string field.
- Missing refs:
  - Preview: warn, leave token unresolved (no crash)
  - Runtime: throw E_VAR_NOT_FOUND unless guarded (e.g., coalesce)

# B) Admin Panel for Global Variables (new)
Add functionality to the existing Admin area to fully manage **Global variables**:

1. Global Variables CRUD (+ groups)
   - Fields: name, group, type (string|number|boolean|array|object|binary|secret), value, validation (regex|JSON schema|min|max|required), state (active|deprecated|pendingRemoval), version (optimistic concurrency)
   - Secrets stored encrypted; never revealed in responses (mask in UI)
   - Group management: create/rename/delete groups; filter by group

2. Impact Analysis (drill-down)
   - On workflow/task **save**, index all references to {{global.*}} ONLY (do not index unqualified {{var}})
   - Provide counts + list of (workflowId, taskId, fieldPath)
   - View from Global var drawer → “Used in X places” with drill-down

3. Versioning & Concurrency
   - Updates require matching version. On mismatch → E_VERSION_CONFLICT: expected <n>, got <m>
   - Simple merge dialog or reload suggestion (you already have the UI shell; only wire the conflict path)

4. Audit Log (redacted)
   - Record create/update/delete with before/after (mask secrets)
   - Expose an Admin “Audit” tab (read-only list)

5. Import/Export
   - JSON/YAML import/export for global variables (secrets remain encrypted or marked as placeholders)
   - Validate on import (type, schema, name pattern)

6. Preview Resolution (Admin)
   - In the edit drawer, add “Preview Resolution” against a sample context (choose workflow, optional run, mock HTTP context)
   - Returns resolved result + warnings; secrets masked

Acceptance:
- Can create/edit/delete global vars and groups
- Version conflicts handled
- Impact table shows accurate counts and drill-down
- Audit entries recorded with masking
- Import/export round-trips (secrets preserved as encrypted or placeholders)
- Preview shows resolved values (masked where secret)

# C) transformion Tool Enhancement (existing tool; extend inputs)
The transformion tool currently **only** reads the HTTP output of the **current** task. Extend it to accept inputs from **other variables** across scopes and compose them:

1. Inputs to transformion
   - Continue supporting current task HTTP output aliases (e.g., HTTP.Current.body)
   - **Add** optional inputs list referencing:
     - **Task variables** by name (current task context)
     - **Workflow variables** by name (current execution)
     - **Global variables** by name (read-only; use explicit global.x when ambiguity arises in expressions)
   - Inputs can be referenced inside transformion expressions via the same templating system:
     - Example: {{customerId}} (workflow var), {{global.prefix}}, {{otherTaskVar}}

2. Output Targets
   - Allow writing to:
     - Task variables (existing behavior)
     - **Workflow variables** (promotion from task → workflow)
     - (Global writes permitted only if your engine supports it and guarded by concurrency—keep off by default unless explicitly enabled per mapping rule)

3. Expression & Helpers
   - Re-use the templating engine + helpers (jsonPath/toJson/fromJson/etc.)
   - Support “read from variable, transform, write to variable” flows:
     - Example mapping: source: "{{ coalesce:jwt,global.defaultJwt }}" → target: "workflow.jwt"

4. Type Validation
   - Enforce target type validation against workflow var definitions
   - Provide default on failure option or fail-fast with E_VAR_TYPE

5. Unit tests
   - Mapping can read HTTP output + workflow var + global var in a single expression
   - Promotions write to workflow scope and are visible to subsequent tasks in the same run

Acceptance:
- transformion tool can read **task/workflow/global** vars as inputs
- transformions can **compose** inputs (e.g., {{global.prefix}}{{customerId | upper}})
- Outputs can write to **workflow** vars (promotion)
- Type validation enforced; clear errors on mismatch

# D) Task-Level Variables (existing CRUD—wire interoperability)
You already have task-level variables add/edit/delete in the Task Definition panel. Ensure interoperability:
But the current vars cannot be used by other tasks in the workflow or even  by other vars in the task. 

1. Precedence & Shadowing
   - At resolution time, unqualified {{var}} uses task → workflow → global
   - To force global, use {{global.var}}

2. Editing & Preview
   - When editing a task field (URL, headers, body, auth), provide inline resolution **preview** using current task vars + workflow defaults (or sample execution vars) + globals + macros
   - Show warnings for missing refs; mask secrets

3. Usage Indexing
   - When saving task definitions, index **only** explicit global references ({{global.*}}) for impact analysis
   - Do not index unqualified names (they resolve at runtime)

Acceptance:
- Existing task var CRUD remains unchanged
- Unqualified names resolve correctly with precedence
- Inline preview works and masks secrets
- Global references are discoverable via impact index

# E) Resolution Engine (shared core)
Implement or extend the core engine used by Preview, Admin Preview, Task editor, and runtime:

1. Compiler & Cache
   - Tokenize/parse {{...}} into AST; cache compiled templates (invalidate on global change or helper/macro change)

2. Evaluation
   - Apply precedence; support dot paths on object values (e.g., {{session.jwt}} if session is a workflow var)
   - Macros are lazy and pure; HTTP context read-only
   - Helpers with pipe syntax; parameter parsing: helper:param1,param2

3. Cycles
   - Detect cycles in **global** variables and **workflow defaults** only (per-run values are dynamic)
   - Error E_VAR_CYCLE: global.a → global.b → global.a at publish/save time

4. Secrets & Masking
   - Secrets encrypted at rest; masked in logs/preview
   - Field-level masking rules for sensitive headers (Authorization, Cookie, etc.)

5. Errors
   - E_VAR_NOT_FOUND, E_VAR_CYCLE, E_VAR_TYPE, E_VERSION_CONFLICT

Acceptance:
- Engine used consistently across Admin Preview, Task Preview, and runtime
- Cycles caught pre-run; clear error messages
- Masking consistent everywhere


# G) Global Variables Concurrency & Audit
- Update global var requires matching version (ETag style)
- On success: write audit record with redacted diffs
- On conflict: E_VERSION_CONFLICT returned; caller decides retry

Acceptance:
- Concurrency enforced
- Audit records created for all global writes

# H) Tests (only for these modules)
- Resolution precedence, helpers, composition
- Macro outputs and HTTP shortcuts
- Cycle detection (globals + workflow defaults)
- transformion tool reading other vars and promoting to workflow
- Admin Preview resolves with masking
- Impact index lists assets for {{global.*}}
- Version conflict path

# I) Examples (use as fixtures in tests)
- Authorization: "Bearer {{jwt}}" with workflow var jwt="abc" → "Bearer abc"
- {{global.prefix}}{{customerId | upper}} → "DEV_C-42"
- Macro: {{now}} → ISO; {{uuid}} any valid v4
- HTTP shortcut: {{HTTP.Login.body.token}} → "tkn"
- Cycle: global.a="{{global.b}}", global.b="{{global.a}}" → cycle error
- transformion: source {{ coalesce:jwt,global.defaultJwt }} → target workflow jwt
- Admin impact: workflow contains {{global.apiBase}} in URL → shows in impact list


