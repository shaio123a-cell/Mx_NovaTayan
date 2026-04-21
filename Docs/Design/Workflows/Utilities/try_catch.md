# Design: TRY / CATCH Utility Node

Status: **Proposed** | Priority: **P1** | Version: **1.1**
Date: 16-April-2026
Parent: [Workflow Utility Nodes](../workflow_utility_nodes.md)

---

## 1. Overview

The TRY/CATCH utility provides a **guarded execution zone** within a workflow. Any node placed inside the TRY zone that fails (FAILED, TIMEOUT) will automatically route execution to the associated CATCH handler node instead of halting the workflow.

This enables production-grade resilience patterns: cleanup logic on failure, error notification, partial-success handling, and graceful degradation — all configurable visually without code.

**Design goals:**
- Visual and intuitive — the "protected zone" is obvious at a glance
- No restructuring of the existing node data model
- Nested TRY blocks are naturally supported
- FINALLY pattern supported via existing fan-in logic
- Detailed error context available in the CATCH branch
- **Built-in retry policy** — transient failures are retried automatically before CATCH fires

---

## 2. Visual Representation

### TRY Zone
A **resizable transparent container** rendered as a colored overlay on the canvas. Nodes are added to the zone by dragging them inside its bounds. The zone has a subtle tinted background (e.g., green-tinted in normal state, red-tinted during/after a failure).

### CATCH Node
A distinct node rendered in **red with a shield / bug icon**. Connected to the TRY zone via a **dashed red edge** labeled `ON_ERROR`. The CATCH node acts as the entry point for all error handling logic.

```
              [Fetch User Input]
                      │
┌────────────── TRY ZONE (guarded) ───────────────────┐
│                                                     │
│   [Call External API] → [Validate Response]         │
│         → [Save to Database]                        │
│                                                     │
└─────────────────────────────────┬───────────────────┘
                                  │ ON_ERROR (dashed red)
                            🛡 [CATCH]
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
            [Log Error Details]         [Notify Ops Channel]
                    │                            │
                    └────────────┬───────────────┘
                                 │
                         [TERMINATE: WARNING]
```

---

## 3. How It Works

### 3.1 Data Model

The TRY zone is a **special non-executable node** stored in `workflow.nodes[]` with `taskType: 'TRY_ZONE'`. It does not create a TaskExecution record — it is purely structural metadata used by the orchestrator.

```json
{
  "id": "try-zone-001",
  "type": "TRY_ZONE",
  "taskType": "TRY_ZONE",
  "label": "Sync User to CRM",
  "position": { "x": 100, "y": 150 },
  "size": { "width": 600, "height": 300 },
  "memberNodeIds": ["node-api-call", "node-validate", "node-db-save"],
  "catchHandlerId": "node-catch-001",
  "catchOnStatuses": ["FAILED", "TIMEOUT"],
  "onMissingCatch": "FAIL_WORKFLOW",
  "retryPolicy": {
    "maxAttempts": 3,
    "backoffType": "exponential",
    "initialDelaySeconds": 5,
    "maxDelaySeconds": 60,
    "retryOnStatuses": ["FAILED", "TIMEOUT"]
  }
}
```

The CATCH node is a **regular executable node** with `taskType: 'CATCH'`:

```json
{
  "id": "node-catch-001",
  "type": "CATCH",
  "taskType": "CATCH",
  "label": "Handle CRM Sync Failure",
  "position": { "x": 400, "y": 500 }
}
```

### 3.2 Execution Flow

```
1. Orchestrator triggers a node that is in a TRY zone's memberNodeIds
2. Node executes normally
3a. If node SUCCEEDS → normal edge routing continues as usual
3b. If node FAILS (status in catchOnStatuses):
    → Orchestrator checks: does the node belong to a TRY zone?
    → If YES: check retryPolicy
        → If retryAttempts < maxAttempts AND status in retryOnStatuses:
            → Increment attempt counter on task execution record
            → Wait initialDelaySeconds * (2 ^ attempt) up to maxDelaySeconds (exponential backoff)
            → Re-queue the SAME node (create new TaskExecution for the same nodeId)
            → Go back to step 2
        → If maxAttempts exhausted OR status not in retryOnStatuses:
            → Route to zone's catchHandlerId
            → Sets _error variable with full failure context (including attempts count)
            → Creates TaskExecution for CATCH node with status PENDING
            → Marks remaining member nodes as BYPASSED
            → Normal execution continues from CATCH node
4. If no TRY zone found: normal failure behavior (fail workflow or follow ON_FAILURE edges)
```

### 3.3 Error Context Variable

When execution routes to the CATCH node, the `_error` workflow variable is automatically populated:

```json
{
  "_error": {
    "failedNodeId": "node-api-call",
    "failedNodeLabel": "Call External API",
    "status": "FAILED",
    "errorMessage": "HTTP 503: Service Unavailable",
    "httpStatus": 503,
    "attempts": 3,
    "tryZoneId": "try-zone-001",
    "tryZoneLabel": "Sync User to CRM",
    "failedAt": "2026-04-16T14:30:00.000Z"
  }
}
```

This variable is available via `{{_error.failedNodeLabel}}`, `{{_error.httpStatus}}`, etc. in any node within or after the CATCH branch.

---

## 4. Configuration Options

| Field | Default | Description |
|---|---|---|
| `label` | `"Try Block"` | Human-readable name shown on the zone header |
| `catchOnStatuses` | `["FAILED", "TIMEOUT"]` | Which terminal statuses trigger the catch route |
| `catchHandlerId` | *(required)* | Node ID of the connected CATCH node |
| `onMissingCatch` | `"FAIL_WORKFLOW"` | What to do if CATCH node is deleted after setup |
| `abandonZoneOnCatch` | `true` | If true, remaining unexecuted member nodes are skipped |
| `retryPolicy.maxAttempts` | `0` (disabled) | Max retry attempts before routing to CATCH. 0 = no retry |
| `retryPolicy.backoffType` | `"exponential"` | `fixed` \| `exponential` \| `none` |
| `retryPolicy.initialDelaySeconds` | `5` | Initial wait before first retry |
| `retryPolicy.maxDelaySeconds` | `60` | Cap on exponential backoff delay |
| `retryPolicy.retryOnStatuses` | `["FAILED","TIMEOUT"]` | Which statuses are eligible for retry (subset of catchOnStatuses) |

---

## 5. Supported Patterns

### 5.1 Basic Error Handling
```
TRY: [API Call → Parse → Save DB]
CATCH: [Log Error] → [Notify Ops]
```

### 5.2 Graceful Degradation
Continue the workflow with a fallback value after an error:
```
TRY: [Fetch Premium Price]
CATCH: [SET price = default_price]  ← VMA node setting a fallback
         │
     [Continue with checkout logic...]
```
Connect CATCH's exit to the same "continue" node as the TRY zone's success exit.

### 5.3 FINALLY Pattern
A node that **always runs** regardless of success or failure — identical to try/finally in code. Connect both the TRY zone's normal success exit AND the CATCH node's exit to the same target node. The existing fan-in logic (`allFinished = predecessorNodeIds.every(...)`) handles this correctly:

```
TRY: [Process Payment]  ──success──┐
CATCH: [Log Failure]    ──always───┤
                                   ▼
                         [Send Execution Summary]   ← FINALLY node
```

> **Important note:** For the FINALLY pattern, the FINALLY node must have BOTH the TRY success exit AND the CATCH exit as incoming edges. The orchestrator's existing `.every()` fan-in logic ensures it only fires when BOTH have completed. However, since only one of them fires per execution (either the success path or the catch path), the FINALLY node will never receive all its predecessors. 
>
> **Solution:** The TRY/CATCH system adds a special `bypassOnCatch` flag to TRY zone exit edges. When the CATCH route fires, the orchestrator marks the TRY zone's success exit as `BYPASSED` (a new terminal status), which satisfies the fan-in check for the FINALLY node.

### 5.4 Re-Throw (Propagate Failure)
Catch, do some cleanup, then still fail the workflow:
```
CATCH: [Notify Ops] → [TERMINATE: status=FAILED, message="{{_error.errorMessage}}"]
```

### 5.5 Nested TRY Blocks
Inner TRY zones shadow the outer zone for their members. If a node in the inner zone fails, the inner CATCH fires first. If the inner CATCH itself fails, the outer CATCH fires.

```
┌── OUTER TRY ──────────────────────────────────┐
│  [Step 1]                                     │
│  ┌── INNER TRY ──────────────┐                │
│  │  [Step 2] → [Step 3]      │                │
│  └────────────────────┬──────┘                │
│                        │ ON_ERROR (inner)      │
│                  [INNER CATCH]                │
│                        │                      │
│  [Step 4]              │                      │
└───────────────────────────────────────────────┘
                         │ ON_ERROR (outer)
                  [OUTER CATCH]
```

### 5.6 Auto-Retry Before Catch
Transient failures (network blips, 503 overloads) are retried automatically before CATCH fires:
```json
"retryPolicy": {
  "maxAttempts": 3,
  "backoffType": "exponential",
  "initialDelaySeconds": 5,
  "maxDelaySeconds": 60
}
```
Timeline for a node that fails 3 times:
```
Attempt 1 → FAILED → wait 5s → retry
Attempt 2 → FAILED → wait 10s → retry
Attempt 3 → FAILED → wait 20s → retry
Attempt 4 → FAILED → maxAttempts exhausted → CATCH fires
_error.attempts = 4
```
The TRY zone border shows an amber **"Retrying (2/3)"** badge during retries in the Inspector.

---

## 6. Inspector Visualization

### 6.1 Canvas Highlighting

| Element | Normal State | After TRY Succeeded | Retrying | After CATCH Triggered |
|---|---|---|---|---|
| TRY zone border | Dashed green | Solid green | Amber pulsing + retry badge | Solid red |
| TRY zone background | Light green tint | Light green tint | Light amber tint | Light red tint |
| Failed node (inside zone) | Normal | — | Amber spinner + attempt count | Red pulse ring |
| CATCH node | Gray | Gray | Gray | Red, highlighted |
| CATCH edges | Dashed red | Dashed gray | Dashed gray | Solid red, animated |
| Bypassed member nodes | Normal | — | — | Gray/strikethrough overlay |

### 6.2 Execution Detail Panel (CATCH Node)

When the CATCH node is clicked in the Inspector:

```
Node:            Handle CRM Sync Failure
Type:            CATCH Handler
Status:          SUCCESS
Triggered By:    node-api-call ("Call External API") — FAILED
Retry Attempts:  3 of 3 exhausted (exponential backoff: 5s → 10s → 20s)

Error Context:
┌──────────────────────────────────────────────────────┐
│ Failed Node:    Call External API                    │
│ Status:         FAILED                               │
│ HTTP Status:    503                                  │
│ Error Message:  Service Unavailable                  │
│ Attempts:       3 (retried, all failed)              │
│ Failed At:      2026-04-16T14:30:00Z                 │
│ TRY Zone:       Sync User to CRM                     │
└──────────────────────────────────────────────────────┘
```

### 6.3 Bypassed Node Indicator

Member nodes that did not execute because an earlier member failed are shown with a **skip badge** ("⊘ Skipped — TRY zone caught error") in their Inspector detail panel.

---

## 7. Designer Interaction Flow

### Creating a TRY/CATCH
1. Drag **TRY ZONE** from the toolbox → appears as a resizable transparent container
2. Drag existing nodes into the container bounds OR draw new nodes inside it
3. The canvas auto-adds dragged nodes to `memberNodeIds`
4. From the toolbox, drag a **CATCH** node anywhere on the canvas
5. Draw a connection from the TRY zone → CATCH node → edge auto-labeled `ON_ERROR` in dashed red
6. Wire up handler nodes after the CATCH node as normal
7. Configure: zone label, catchOnStatuses, onMissingCatch settings

### Removing a Node from the TRY Zone
- Drag the node outside the zone bounds → it's removed from `memberNodeIds` automatically
- The node reverts to normal failure behavior (follows its own ON_FAILURE edges or fails workflow)

### Resizing the Zone
- Drag zone border handles to resize
- The canvas checks which nodes fall within the new bounds and updates `memberNodeIds` accordingly

### Designer Validation
- ⚠️ Warning if TRY zone exists but has no connected CATCH node
- ⚠️ Warning if TRY zone has no member nodes
- ❌ Error if CATCH node has no outgoing edges (dead end — nothing would happen on error)

---

## 8. Codebase Changes Required

| Layer | File | Change |
|---|---|---|
| **Orchestration Engine** | `worker.service.ts` → `handleWorkflowOrchestration` | Before normal edge routing, check if the failed node belongs to a TRY zone. Check retry policy first — if retries remain, re-queue the node with backoff delay. If exhausted, route to `catchHandlerId`, mark remaining members as `BYPASSED`, set `_error` variable. |
| **Retry Backoff Scheduler** | `worker.service.ts` | Helper: `scheduleRetry(taskExecId, delaySeconds)` — updates task status to `PENDING` after the backoff delay elapses. Stores `retryAttempt` counter on the task execution record. |
| **Zone Membership Lookup** | `worker.service.ts` | Helper: `findEnclosingTryZone(nodeId, workflowNodes): TryZoneNode \| null` — walks `workflow.nodes[]` to find TRY_ZONE where `memberNodeIds.includes(nodeId)`. For nested zones, returns innermost match. |
| **New terminal status** | Prisma schema / TaskExecution | Add `BYPASSED` to the status enum — for member nodes skipped because their zone caught an error |
| **Fan-in logic** | `worker.service.ts` | Update `allFinished` check to treat `BYPASSED` as a terminal status |
| **Workflow DTO** | `workflow.dto.ts` | Accept `TRY_ZONE` and `CATCH` as valid `taskType` values. Add `memberNodeIds`, `catchHandlerId`, `size`, `retryPolicy` fields to node schema |
| **ReactFlow Canvas** | New component: `TryZoneNode.tsx` | Resizable transparent container with dashed border, zone label header, retry badge, drag-to-add membership logic |
| **ReactFlow Canvas** | New component: `CatchNode.tsx` | Red shield-icon node |
| **Edge Auto-Label** | `WorkflowDesigner.tsx` | When connecting TRY_ZONE → CATCH, auto-set `condition: 'ON_ERROR'`, `label: 'ON_ERROR'`, dashed red style |
| **Membership Logic** | `WorkflowDesigner.tsx` | On node position change, check if node is inside any TRY_ZONE bounds and update `memberNodeIds` |
| **Inspector** | `WFICanvas.tsx` | TRY zone visual state (success/retrying/failure border). Attempt counter on failed node. CATCH node highlighting. BYPASSED node overlay |
| **Inspector Detail** | `ExecutionDetailPanel.tsx` | CATCH node shows error context + retry attempts. Bypassed nodes show skip badge |

---

## 9. Edge Cases & Decisions

| Scenario | Behavior |
|---|---|
| **Node in TRY zone fails with status not in `catchOnStatuses`** | Normal failure behavior — CATCH is NOT triggered. (e.g., MAJOR status if only FAILED/TIMEOUT in catchOnStatuses) |
| **CATCH node itself fails** | Routes to outer TRY zone's CATCH if nested, otherwise fails the workflow normally |
| **Member node has explicit ON_FAILURE edges AND is in a TRY zone** | TRY zone takes precedence — ON_FAILURE edges are not followed. The zone's CATCH fires instead |
| **Two nodes in the zone fail simultaneously** | CATCH is triggered once. The `_error` variable reflects the first failure. Second failure is ignored (zone already in catch state) |
| **TRY zone has zero member nodes** | Designer shows warning. At runtime, zone is treated as a no-op pass-through |
| **CATCH node is later deleted** | `onMissingCatch: 'FAIL_WORKFLOW'` causes workflow to fail with a configuration error message |
| **Node is dragged between two overlapping TRY zones** | Assigned to the innermost zone (smallest bounding box containing the node) |
| **FINALLY node — only one branch fires** | The `BYPASSED` status on the non-fired path satisfies the fan-in `.every()` check, allowing the FINALLY node to fire |

---

## 10. Future Extensions (Out of Scope for V1)

- **Zone-level SLA timeout** — If the entire TRY zone takes longer than N seconds in total wall-clock time, treat it as TIMEOUT and route to CATCH with `_error.reason: 'ZONE_SLA_EXCEEDED'`
- **Typed error routing (multiple CATCH branches)** — Multiple CATCH edges from the TRY zone, each filtered by HTTP status pattern (4xx, 5xx, 429) or error message regex. e.g., ON_ERROR:401 routes to token refresh, ON_ERROR:5xx routes to Ops notification
- **Per-member-node catch override** — Allow individual nodes inside a zone to have their own catch handler that overrides the zone's handler
- **Error taxonomy** — Tag catch handlers by error type (network, auth, data validation) for structured error routing
- **Alert deduplication** — If CATCH fires a notification and the workflow runs 100 times in an hour all failing, suppress duplicate notifications after the first N
