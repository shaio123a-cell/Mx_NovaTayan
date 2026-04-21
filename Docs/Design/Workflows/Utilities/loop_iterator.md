# Design: LOOP / ITERATOR Utility Node

Status: **Proposed** | Priority: **P1** | Version: **1.1**
Date: 16-April-2026
Parent: [Workflow Utility Nodes](../workflow_utility_nodes.md)

---

## 1. Overview

The LOOP utility enables a workflow to execute a set of nodes **repeatedly** — once per element in an array variable. This is the foundational primitive for any batch operation: processing lists of users, tickets, records, files, or API pages.

**Design goals:**
- Visual zone container (consistent with TRY ZONE visual approach)
- Full per-iteration context variables (`_item`, `_loop.index`, `_loop.total`, etc.)
- **Tiered Storage Design**: Efficient summary-only storage for successful iterations; full records for errors
- **Batch Chunking**: Support for processing items in chunks of N (for bulk APIs)
- **Operational Excellence**: Search/filter iterations and Re-Run Failed Items button
- **API Pagination**: Built-in logic for handling paginated results
- Safe by default: `maxIterations` cap prevents runaway infinite loops
- Works naturally with AGGREGATE and TRY/CATCH inside the zone

---

## 2. Visual Representation

### LOOP Zone
A **resizable transparent container** (same design language as TRY ZONE) with a **teal/cyan color scheme** to distinguish it from TRY zones (green). It shows a live **iteration progress badge** during execution: `"⟳ Iteration 42 / 150"`.

```
[Fetch All Users]   ← Returns: users[] (150 items)
       │
┌─────────────────── LOOP ZONE ─────────────────────┐
│  ⟳ for each user in users[] (as: current_user)   │
│                                                   │
│  [POST /api/jira/issue                            │
│   body: {title: {{current_user.name}}}] →         │
│         [AGGREGATE: ticket_id → ticket_ids[]]     │
│                                                   │
└─────────────────────────────────────┬─────────────┘
                                      │ (after all iterations complete)
                              [Send Summary Report]
                              "Created {{ticket_ids.length}} tickets"
```

### LOOP Progress Badge States
| State | Badge |
|---|---|
| Not started | `⟳ 0 / N` (teal dashed border) |
| Running | `⟳ 42 / 150` (teal pulsing border, animated) |
| Completed | `✓ 150 / 150` (solid teal border) |
| Completed with skips | `⚠ 148 / 150 (2 skipped)` (amber border) |
| Stopped on failure | `✗ stopped at 42 / 150` (red border) |

---

## 3. How It Works

### 3.1 The DAG Problem and Solution

NovaTayan's workflow engine is a **Directed Acyclic Graph (DAG)** — each node runs exactly once in a normal flow. Loops require running the same nodes N times, which creates cycles. 

**Solution:** Add an `iteration` field to `TaskExecution`. The uniqueness constraint changes from:
```
UNIQUE(workflowExecutionId, nodeId)  ← Old
```
to:
```
UNIQUE(workflowExecutionId, nodeId, iteration)  ← New
```

Each loop iteration spawns a fresh batch of TaskExecution records for the body nodes with `iteration: 1`, `iteration: 2`, etc. All are linked to the same LOOP_ZONE execution record as their parent. The orchestrator can identify "this node is part of iteration 7" by its `(nodeId, iteration)` key.

### 3.2 Data Model

The LOOP zone is stored in `workflow.nodes[]` with `taskType: 'LOOP_ZONE'`:

```json
{
  "id": "loop-zone-001",
  "type": "LOOP_ZONE",
  "taskType": "LOOP_ZONE",
  "label": "Create Jira Ticket per User",
  "position": { "x": 100, "y": 200 },
  "size": { "width": 700, "height": 350 },
  "memberNodeIds": ["node-create-ticket", "node-aggregate-ids"],
  "sourceVariable": "users",
  "itemAlias": "current_user",
  "identifierField": "email",
  "batchSize": 1,
  "debugMode": "ERRORS_ONLY",
  "breakCondition": null,
  "maxIterations": 10000,
  "onIterationFailure": "SKIP_FAILED_ITERATION",
  "sequential": true,
  "maxConcurrency": 1
}
```

### 3.3 Iteration Context Variables

Before each iteration of the body nodes, the following variables are automatically injected into `workflowVars`:

| Variable | Type | Example | Description |
|---|---|---|---|
| `_item` | any | `{ "id": 42, "name": "Alice" }` | Alias for current array element (same as `itemAlias`) |
| `{{itemAlias}}` | any | `current_user` | The alias name set by designer — maps to `_item` |
| `_loop.index` | number | `3` | 0-based index of current iteration |
| `_loop.iteration` | number | `4` | 1-based iteration number (friendlier for messages) |
| `_loop.total` | number | `150` | Total elements in the source array |
| `_loop.remaining` | number | `146` | Items left after this one |
| `_loop.isFirst` | boolean | `false` | True only for iteration 1 |
| `_loop.isLast` | boolean | `false` | True only for the last iteration |
| `_loop.skippedCount` | number | `2` | Number of iterations skipped due to errors so far |

### 3.4 Execution Flow

```
1. LOOP_ZONE node is triggered by the orchestrator
2. Orchestrator resolves sourceVariable → reads the array from workflowVars
3. If array is empty → LOOP_ZONE completes immediately as SUCCESS (0 iterations)
4. For iteration i = 0; i < array.length; i++:
    a. Evaluate breakCondition (if configured) against current workflowVars
       → If true: stop loop, mark LOOP_ZONE as SUCCESS, proceed to downstream nodes
    b. Check if i >= maxIterations → If true: stop with WARNING status
    c. Inject iteration context variables (_item, _loop.index, etc.) into workflowVars
    d. Spawn TaskExecution records for all memberNodeIds with iteration: i+1
    e. Execute body nodes (sequential or concurrent based on config)
    f. Wait for ALL body node executions to complete
    g. On body node failure:
       - STOP_ON_FIRST_FAILURE: mark LOOP_ZONE as FAILED, stop, trigger no more iterations
       - SKIP_FAILED_ITERATION: increment _loop.skippedCount, continue to iteration i+1
       - (TRY/CATCH inside zone handles per-node errors before this point)
    h. Collect any AGGREGATE outputs for this iteration
5. All iterations complete → LOOP_ZONE marked SUCCESS (or WARNING if skips occurred)
6. Final AGGREGATE arrays available as workflow variables
7. Normal orchestration continues to downstream nodes
```

### 3.5 Variable Isolation

Variables modified by nodes inside the loop are **shared across the workflow context** (not isolated per iteration). This is intentional — it mirrors how NovaTayan currently handles variable scoping.

**Important consequences:**
- If a body node sets `status = "done"`, the NEXT iteration sees `status = "done"`
- `_item` and all `_loop.*` variables are overwritten at the start of each iteration
- Use AGGREGATE to collect per-iteration outputs safely into arrays
- Use VMA nodes inside the loop to reset any variables that should NOT carry over

This keeps the implementation simple and avoids the complexity of per-iteration variable sandboxes.

---

## 4. Configuration Options

| Field | Default | Description |
|---|---|---|
| `label` | `"Loop"` | Human-readable name shown on zone header |
| `sourceVariable` | *(required)* | The workflow variable name holding the array to iterate |
| `itemAlias` | `"_item"` | Variable name for the current element in each iteration |
| `identifierField` | `null` | Key in the item object used for labeling iterations in the Inspector (e.g., "email") |
| `batchSize` | `1` | If > 1, iterates in chunks of N. `_batch` contains the array slice. |
| `debugMode` | `"ERRORS_ONLY"` | `ALL` \| `ERRORS_ONLY` \| `FIRST_LAST` \| `NONE`. Controls TaskExecution record creation. |
| `breakCondition` | `null` | Expression evaluated before each iteration; if true, exits loop early |
| `maxIterations` | `10000` | Safety cap — stops the loop if iteration count exceeds this |
| `onIterationFailure` | `"STOP_ON_FIRST_FAILURE"` | `STOP_ON_FIRST_FAILURE` \| `SKIP_FAILED_ITERATION` |
| `sequential` | `true` | If true, one iteration at a time. If false, uses `maxConcurrency` |
| `maxConcurrency` | `1` | Max simultaneous iterations (only used when `sequential: false`) |

---

## 5. Supported Patterns

### 5.1 Basic Sequential Batch
```
[GET /api/users] → [LOOP: users[], as: user]
                       → [POST /api/jira/issue (title: {{user.name}})]
                   [END LOOP]
                   → [Send: "All tickets created"]
```

### 5.2 Best-Effort Batch (Skip Failures)
Process all items, skip any that fail, report at the end:
```
"onIterationFailure": "SKIP_FAILED_ITERATION"

[LOOP: records[]] → [Process Record] → [AGGREGATE: record.id → processed_ids[]]
[END] → [NOTIFY: "Processed {{processed_ids.length}} / {{_loop.total}} records.
         Skipped: {{_loop.skippedCount}}"]
```

### 5.3 Break on Condition
Stop processing items once a condition is met — e.g., find first matching record:
```
breakCondition: "found_user != null"

[LOOP: users[]]
  → [IF: user.email == target_email]
      THEN: [VMA: set found_user = current_user]  ← sets variable, loop breaks next iteration check
      ELSE: (no-op)
[END LOOP]
→ [Use found_user...]
```

### 5.4 Per-Item Error Handling with TRY/CATCH
Place a TRY zone INSIDE the LOOP zone for per-iteration error handling. Failures are caught per-item instead of affecting the loop control:
```
[LOOP: items[]]
  ┌── TRY ZONE ─────────────────────────┐
  │  [Call Slow External API]           │
  │  [Parse Response]                   │
  └─────────────────────────┬───────────┘
                             │ ON_ERROR
                       [CATCH: log error, set item_status = "failed"]
  → [AGGREGATE: item_status → item_statuses[]]
[END LOOP]
```

### 5.5 Collecting Results with AGGREGATE
Use AGGREGATE inside the loop to collect per-iteration values:
```
[LOOP: orders[]]
  → [POST /api/invoice/create (orderId: {{_item.id}})]
  → [AGGREGATE: HTTP.last.body.invoiceId → invoice_ids[]]
[END LOOP]
→ [POST /api/notify (ids: {{invoice_ids}})]
```
After the loop, `invoice_ids` is an array of all collected values.

### 5.6 Concurrent Batch Processing
Run up to 10 items simultaneously — useful when items are independent and the external API allows parallel calls:
```json
"sequential": false,
"maxConcurrency": 10
```
```
[LOOP: 1000 users, concurrency: 10]
  → [POST: Send Newsletter to {{current_user.email}}]
[END] → [NOTIFY: "Newsletter sent to {{_loop.total}} users"]
```
All 1000 iterations run in groups of 10 simultaneously. Total wall-clock time reduced ~10×.

### 5.7 Nested Loops
A LOOP zone inside another LOOP zone. Inner `_loop.*` shadows outer `_loop.*`. Configure custom `itemAlias` to avoid conflicts:
```
[LOOP: departments[], as: dept]
  [LOOP: dept.members[], as: member]
    [POST: Assign {{member.name}} to project in {{dept.name}}]
  [END INNER LOOP]
[END OUTER LOOP]
```
The orchestrator tracks each nested loop's state independently by loop zone ID.

### 5.8 Batch Chunking (Bulk API Processing)
When `batchSize` > 1, the item alias becomes an array slice (the "chunk"). This is used for APIs that support bulk operations (e.g., Jira Bulk Issue Create).

```json
"batchSize": 50,
"itemAlias": "_chunk"
```

```
[LOOP: 1000 users, batchSize: 50]
  → [POST /api/bulk-create { "items": {{_chunk}} }]
[END] → 20 API calls executed instead of 1000.
```

### 5.9 API Pagination Pattern (Template)
A pre-configured template using a LOOP + Break Condition to pull all pages from a REST API:
```
[VMA: set offset = 0]
[LOOP: until response.hasNextPage == false]
  → [GET /api/records?limit=100&offset={{offset}}]
  → [VMA: set offset = offset + 100]
  → [AGGREGATE: response.data into all_records[]]
[END]
```
The loop uses a `breakCondition` matched against the "is last page" flag or empty data array from the API response.

---

## 6. AGGREGATE Node Integration

AGGREGATE is a lightweight companion node designed to be placed inside a LOOP zone. It has no standalone use outside of a loop context.

### Data Model
```json
{
  "id": "node-aggregate-001",
  "taskType": "AGGREGATE",
  "sourceExpression": "HTTP.last.body.id",
  "targetVariable": "created_ticket_ids",
  "aggregateMode": "push"
}
```

### Aggregate Modes
| Mode | Behavior |
|---|---|
| `push` | Append the value to an array (default) |
| `push_unique` | Append only if not already in the array (dedup) |
| `sum` | Add numeric value to running total |
| `count_truthy` | Increment counter if value is truthy |
| `concat` | String concatenation with separator |

### Post-Loop Availability
After the loop completes, the accumulated array is available as a normal workflow variable:
```
{{created_ticket_ids}}        → [42, 67, 89, 104, ...]
{{created_ticket_ids.length}} → 150
```

---

## 7. Inspector Visualization

### 7.1 Canvas During Execution
```
┌─── LOOP ZONE ─────────────────────────────────────────┐
│ ⟳ Iteration 42 / 150  ░░░░░░░░████████████ 28%        │
│                                                       │
│  [Create Jira Ticket] ● RUNNING                       │
│  [Aggregate ID]       ○ PENDING                       │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 7.2 Inspector Execution Tree (Post-Run)

The Inspector shows a collapsible tree grouped by iteration:

```
LOOP: Create Jira Ticket per User      ✓ 150/150  (2m 34s)
  ├── Iteration 1   ✓ (212ms)
  │   ├── Create Jira Ticket   ✓ HTTP 201  (198ms)
  │   └── Aggregate ticket_id  ✓            (1ms)
  ├── Iteration 2   ✓ (189ms)
  │   ├── Create Jira Ticket   ✓ HTTP 201  (175ms)
  │   └── Aggregate ticket_id  ✓            (1ms)
  ├── Iteration 43  ⊘ SKIPPED (HTTP 429 - Rate Limited)
  ├── ...
  └── Iteration 150  ✓ (201ms)
```

### 7.3 Tiered Storage Design (Efficiency)
Storing full TaskExecution records for 1,000+ iterations is unsustainable. NovaTayan uses **Tiered Storage**:

1. **One Master Record**: The LOOP_ZONE TaskExecution stores a compact `iterationSummaries` JSON array in its result column. Each row (~50 bytes) contains index, status, duration, and the identifier (e.g., email).
2. **Selective Full Records**: Full TaskExecution records (payloads/headers) are created only based on `debugMode`:
   - `ERRORS_ONLY`: Only for failed/skipped iterations.
   - `FIRST_LAST`: For iterations 1, N, and any errors.
   - `ALL`: Every iteration (Dev mode only).

### 7.4 Inspector Table & Filtering
Clicking the LOOP zone opens a searchable iteration table:

```
[ Filter: Failures Only ▼ ]  [ Search: d.chen... 🔍 ]  [ Re-Run Failed Items ⟳ ]

│ # │ identifier (email)    │ Status  │ ms  │ Action       │
│───┼───────────────────────┼─────────┼─────┼──────────────┤
│ 1 │ alice@company.com     │ ✓       │ 212 │ [Details]    │
│43 │ d.chen@company.com    │ ✗ Fail  │ 150 │ [Details] 🔍 │
│44 │ r.patel@company.com   │ ⊘ Skip  │  —  │ [Details] 🔍 │
```

### 7.5 Operational Feature: Re-Run Failed Items
In the Inspector, a **"Re-Run Failed Items"** button appears if errors occurred.
- Clicking it creates a **new workflow execution**.
- It automatically pre-filters the `sourceVariable` array to include **only the items that failed or skipped** in the previous run.
- This saves significant time and compute cost compared to re-running 1,000 items.

## 8. Designer Interaction Flow

### Creating a LOOP
1. Drag **LOOP ZONE** from toolbox → resizable teal container appears
2. Drag body nodes into the zone (or draw new nodes inside it)
3. Click zone to open config panel:
   - **Source Variable**: pick from variable picker (only array-type variables shown)
   - **Item Alias**: set the iteration variable name (default: `_item`)
   - **On Failure**: choose STOP or SKIP
   - **Sequential / Concurrent**: toggle; if concurrent, set max concurrency
   - **Break Condition**: optional expression builder (same as IF node)
   - **Max Iterations**: safety cap
4. Optionally add AGGREGATE node(s) inside the zone
5. Connect downstream nodes from the zone's exit handle

### Connecting Exit
- The LOOP zone has a single exit handle (bottom or right)
- Execution reaches the exit only when ALL iterations complete (or loop breaks/stops)
- Connect to any downstream node normally

### Designer Validation
- ⚠️ Warning if source variable is not an array type
- ⚠️ Warning if zone has no member nodes
- ⚠️ Warning if maxConcurrency > 50 (very high, likely misconfigured)
- ❌ Error if sourceVariable is not set

---

## 9. Codebase Changes Required

| Layer | File | Change |
|---|---|---|
| **Prisma Schema** | `schema.prisma` | Add `iteration Int @default(0)` field to `TaskExecution`. Remove uniqueness on `(workflowExecutionId, nodeId)`, replace with `(workflowExecutionId, nodeId, iteration)` |
| **Orchestration Engine** | `worker.service.ts` → `handleWorkflowOrchestration` | Add LOOP_ZONE handler — resolves source array, spawns body node executions per iteration with `iteration` counter, handles fan-in per iteration, checks break condition, respects `onIterationFailure` |
| **Duplicate Guard** | `worker.service.ts` | Update existing `"Ensure we don't create duplicate executions"` check to use `(nodeId, iteration)` composite key |
| **Fan-in Logic** | `worker.service.ts` | Update `predecessorRecords` lookup to also filter by `iteration` — so iteration N's fan-in only looks at iteration N's predecessor records |
| **AGGREGATE Executor** | `worker.service.ts` (or new `loopAggregateService.ts`) | Server-side handler for AGGREGATE node — resolves `sourceExpression` against current workflowVars, appends to the accumulator array stored in `workflowVars._loop_agg.{loopId}.{targetVariable}[]`. After loop completes, moves accumulator to `targetVariable` |
| **Workflow DTO** | `workflow.dto.ts` | Accept `LOOP_ZONE` and `AGGREGATE` as valid `taskType` values. Add loop config fields to node schema |
| **ReactFlow Canvas** | New: `LoopZoneNode.tsx` | Teal resizable container with iteration progress badge, live progress bar during execution |
| **ReactFlow Canvas** | New: `AggregateNode.tsx` | Small compact node styled within loop zone |
| **Membership Logic** | `WorkflowDesigner.tsx` | Same drag-to-add membership logic as TRY zone — detects node position within zone bounds |
| **Inspector Tree** | `ExecutionDetailPanel.tsx` | Grouped iteration tree view: LOOP → Iter 1 → nodes → Iter 2 → nodes... |
| **Inspector Canvas** | `WFICanvas.tsx` | Loop zone progress overlay, per-iteration status color |

---

## 10. Edge Cases & Decisions

| Scenario | Behavior |
|---|---|
| **Source array is empty** | Loop completes immediately as SUCCESS. Body nodes never execute. AGGREGATE outputs are empty arrays. Downstream nodes receive `_loop.total = 0` |
| **Source variable doesn't exist or is null** | LOOP_ZONE fails with a descriptive error: "sourceVariable 'users' is null or undefined" |
| **Source variable is not an array** | LOOP_ZONE fails with: "sourceVariable 'users' is not iterable (got: string)" |
| **maxIterations reached** | Loop stops at `maxIterations`, continues with status WARNING and `_loop.stoppedEarly = true`. Downstream nodes still fire |
| **Break condition evaluated before first iteration** | If true on first check, zero iterations execute. Loop completes immediately as SUCCESS |
| **Concurrent iterations — same variable written by multiple iterations** | Last write wins (race condition). Designer should use AGGREGATE for collecting per-iteration outputs rather than writing to a shared variable. Documented as a known limitation |
| **STOP_ON_FIRST_FAILURE — which iteration fails?** | The iteration number and failed node are surfaced on the LOOP_ZONE's execution record. Subsequent iterations are marked BYPASSED |
| **Nested loops — inner loop fails** | The inner LOOP_ZONE becomes FAILED. If `onIterationFailure: 'STOP'` on the outer loop, outer loop stops. If `'SKIP'`, outer loop continues with next outer iteration |
| **AGGREGATE without enclosing LOOP** | Designer validation prevents this. At runtime, AGGREGATE is a no-op if no loop context exists |
| **TRY ZONE inside LOOP ZONE** | Fully supported. TRY/CATCH error handling wraps individual body nodes within each iteration independently |
| **LOOP ZONE inside TRY ZONE** | Fully supported. If the loop fails (STOP_ON_FIRST_FAILURE), the outer TRY zone catches it |

---

## 11. Future Extensions (Out of Scope for V1)

- **Variable sandboxing per iteration** — True isolation of variable mutations between iterations. Prevents one iteration's side effects from affecting subsequent iterations
- **Progress webhook** — Fire an inbound webhook or notification every N% of completion (e.g., "25% done")
- **Dynamic source array** — Re-evaluate the source expression each iteration rather than once at LOOP start (for streaming/live data)
- **LOOP over date ranges** — Built-in iterator over time periods (e.g., "for each day from startDate to endDate")
- **Result streaming** — Pass each iteration's AGGREGATE result to a downstream node immediately rather than waiting for all iterations to complete
