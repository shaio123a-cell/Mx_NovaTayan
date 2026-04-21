# Design: TERMINATE / ABORT Utility Node

Status: **Proposed** | Priority: **P2** | Version: **1.0**
Date: 20-April-2026
Parent: [Workflow Utility Nodes](../workflow_utility_nodes.md)

---

## 1. Overview

The `TERMINATE` utility node provides explicit control over the workflow's lifecycle. It allows a designer to force-stop execution at a specific point, either to exit gracefully (Success), report a business failure (Fail), or control loop flow (Break/Continue).

**Design Goals:**
- **Context-Aware**: Behaves differently inside Loops vs. standard DAG paths.
- **Granular Control**: Ability to stop just a branch or the entire global execution.
- **Improved UX**: Eliminates the need for complex "IF" trees just to avoid executing remaining nodes.

---

## 2. Visual Representation

The `TERMINATE` node is a compact utility node with an **Octagon/Stop icon**. Its color changes based on the configured `finalStatus`.

```
[IF: Balance < 0]
      │
      ▼ (YES)
[TERMINATE: "Insufficient Funds"]  ← Status: FAILED (Red)
```

**Node UI in Designer:**
- **Icon**: `Octagon` or `Square` (Stop)
- **Colors**: 
    - **Gray**: For graceful exits (Success).
    - **Red**: For error exits (Failed).

---

## 3. Configuration Scopes

### 3.1 Standard Path (Non-Loop)
When placed in a normal workflow path, the node offers two scopes:

| Scope | Behavior |
|---|---|
| `STOP_PATH` | Stops the current branch. Parallel branches continue normally. |
| `TERMINATE_WORKFLOW` | Kills the entire execution immediately. |

### 3.2 Loop-Specific Behavior
If the node is placed inside a **LOOP ZONE**, it gains two additional powerful behaviors:

| Scope | Behavior | Alias |
|---|---|---|
| `STOP_ITERATION` | Stops the current item's execution and moves to the **Next Item**. | `continue` |
| `EXIT_LOOP` | Stops the current item and **Cancels all remaining items**. Continues with nodes *after* the loop. | `break` |

---

## 4. How It Works (Engine Logic)

1. **Detection**: The orchestrator resolves the `scope` and `finalStatus`.
2. **Termination**:
    - If `TERMINATE_WORKFLOW`: The `WorkflowExecution` status is set to the `finalStatus`. All pending/running tasks are cancelled.
    - If `EXIT_LOOP`: The loop zone's iteration cycle is halted. The orchestrator triggers the node(s) connected to the loop zone's exit handle.
    - If `STOP_ITERATION`: The fan-in counter for the current iteration is satisfied immediately, and the loop moves to the next `_loop.index`.
3. **Audit**: The `reason` expression is resolved and stored in the node's `error` or `result` column for inspection.

---

## 5. Configuration Options

| Field | Default | Description |
|---|---|---|
| `label` | `"Terminate"` | Label shown on the canvas |
| `scope` | `"STOP_PATH"` | `STOP_PATH` \| `TERMINATE_WORKFLOW` \| `STOP_ITERATION` \| `EXIT_LOOP` |
| `finalStatus` | `"SUCCESS"` | `SUCCESS` \| `FAILED` (Only applies to workflow scope) |
| `reason` | `""` | Optional message or expression explaining the stop |

---

## 6. Examples

### 6.1 Early Graceful Exit
"If the user is already registered, stop the workflow but don't mark it as an error."
- **Condition**: IF `user.exists == true`
- **Node**: `TERMINATE (Scope: TERMINATE_WORKFLOW, Status: SUCCESS)`

### 6.2 Data Validation Failure
"If the API returns an empty list, fail the workflow with a clear message."
- **Condition**: IF `response.length == 0`
- **Node**: `TERMINATE (Scope: TERMINATE_WORKFLOW, Status: FAILED, Reason: "No data found")`

### 6.3 Filtering inside a Loop
"Process only users with valid emails; skip the rest."
- **Condition**: IF `email.valid == false`
- **Node**: `TERMINATE (Scope: STOP_ITERATION)`

---

## 7. Inspector Visualization

When an execution hits a `TERMINATE` node:
1. The node glows with its final status color (Gray/Red).
2. The WFI detail panel shows: **"Execution terminated by user logic: [Reason]"**.
3. All downstream paths that were never reached are marked as **BYPASSED** (dotted lines).
