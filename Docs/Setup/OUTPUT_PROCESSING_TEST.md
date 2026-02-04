# Output Processing — Test Scenario

This document shows a minimal end-to-end test scenario for Output Processing preview and task persistence.

## Purpose
- Verify the client-side Preview uses the YAML spec + Sample Input to produce transformed output.
- Save the transform + variable extraction with the task so the worker can later run it.

## Quick manual steps (UI)
1. Start the web dev server:

```bash
npm run dev -w apps/web
```

2. Open the app (Vite URL, typically http://localhost:5173).
3. Create a new Task (or Edit existing).
4. Open the `Output Processing` tab.

### Example YAML (employees -> minimal JSON output)
```yaml
version: 1
name: employees_minimal_json
input:
  type: json
  root: $.employees[]
output:
  type: json
mappings:
  - name: employee_id
    expr: id
    type: number
  - name: city
    expr: city
defaults:
  on_missing: error
```

### Sample Input JSON
```json
{
  "employees": [
    {"id":101,"name":"Jordan Smith","age":29,"city":"New York","work_address":"750 7th Ave, New York, NY 10019"},
    {"id":102,"name":"Sarah Chen","age":34,"city":"San Francisco","work_address":"1 Market St, San Francisco, CA 94105"},
    {"id":103,"name":"Marcus Miller","age":42,"city":"Chicago","work_address":"233 S Wacker Dr, Chicago, IL 60606"},
    {"id":104,"name":"Elena Rodriguez","age":27,"city":"Austin","work_address":"500 W 2nd St, Austin, TX 78701"}
  ]
}
```

5. Paste YAML into the Transformation Spec area and sample JSON into Sample Input.
6. Click the `Preview` button (top-right of the Output Processing header).

Expected preview: a JSON array of objects with `employee_id` (numbers) and `city` fields.

## Save task via API (optional)
If you prefer to create the task via API and then run it, use these steps (assumes API running at http://localhost:3000):

1) Save YAML into a file `transform.yaml` and sample input into `sample.json`.
2) Create task payload `task_payload.json` (example):

```json
{
  "name": "Extract Employees",
  "description": "Demo extract employees",
  "method": "GET",
  "url": "https://example.invalid",
  "headers": {},
  "body": "",
  "timeout": 30000,
  "tags": [],
  "outputMutation": { "transformTemplate": "<paste YAML here as a single-line escaped string or via your client>" },
  "variableExtraction": { "vars": { }, "sampleInput": "" }
}
```

3) Create via curl:

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d @task_payload.json
```

4) Execute the task (requires API + worker):

```bash
curl -X POST http://localhost:3000/api/tasks/<TASK_ID>/execute
```

## Notes & expectations
- The browser preview is client-side only and uses the same `shared-xform` engine code bundled into the web app.
- The `root` field supports JSONPath-style `$` (e.g. `$.employees[]`) — the code translates it to JMESPath for evaluation.
- Variables added in the UI are saved on the task as `variableExtraction` with a `__scopes` map; the worker must implement applying/persisting them at runtime.

## Troubleshooting
- If you still see "Unknown character: $": ensure you are running the latest front-end build (HMR should pick up changes). Restart `npm run dev -w apps/web` if needed.
- For runtime persistence, ensure the API and worker are running (`npm run dev -w apps/api` and `npm run dev -w apps/worker`) and that DB/Temporal are available.
