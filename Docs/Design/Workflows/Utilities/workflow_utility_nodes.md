# Design: Workflow Utility Nodes (Toolbox Extension)

Status: **Proposed** | Priority: **High** | Version: **1.0**
Date: 16-April-2026

---

## 1. Overview

The NovaTayan Workflow Designer currently supports three node types:
- **HTTP Task** — executes an API call
- **Variable Manipulation Activity (VMA)** — mutates workflow variables
- **Child Workflow (CWF)** — triggers a nested workflow

This document defines the full set of **Utility Nodes** to be added to the Workflow Designer toolbox, providing control flow, data manipulation, communication, and developer experience capabilities that elevate NovaTayan to a production-grade enterprise workflow engine.

> **Note on PARALLEL/JOIN:** Not listed below because it is **already natively supported** by the engine. If a node has multiple incoming edges, the orchestration engine waits for ALL predecessors to complete before triggering it (fan-in is implemented via `.every()` predecessor check in `handleWorkflowOrchestration`).

---

## 2. Priority Table

| Priority | Node | Category | Notes |
|---|---|---|---|
| **P1** | IF / THEN / ELSE | Control Flow | Most impactful missing feature |
| **P1** | TRY / CATCH | Control Flow | Production resilience |
| **P1** | LOOP / ITERATOR | Control Flow | Batch operations over arrays |
| **P1** | COMMENT / ANNOTATION | Designer UX | Readability of complex workflows |
| **P1** | NOTIFY | Communication | Reuses existing WFA notification sender code |
| **P2** | SWITCH / CASE | Control Flow | Multi-branch alternative to nested IFs |
| **P2** | AGGREGATE | Data Utility | Collect loop outputs into array variable |
| **P2** | TERMINATE | Control Flow | Clean early exit with custom status |
| **P2** | WAIT / DELAY | Control Flow | Polling, backoff, scheduled continuation |
| **P2** | CONCURRENT LOOP | Performance | Parallel batch with concurrency cap |
| **P3** | ASSERT / GATE | Control Flow | Pre-condition guards |
| **P3** | RATE LIMITER | Ops | Throttle iterations to avoid API rate limits |
| **P3** | APPROVAL GATE | Human-in-Loop | Pause for human approval before continuing |
| **P3** | WEBHOOK WAIT | Event-Driven | Pause until inbound webhook received |
| **P3** | CHECKPOINT / RESUME | Resilience | Resume long-running workflows after crash |
| **P3** | DEDUP / FILTER | Data Utility | Deduplicate or filter array variables |
| **P4** | SUB-FLOW BOOKMARK | Designer UX | Visual grouping region on canvas |

---

## 3. Node Specifications

---

### 3.1 IF / THEN / ELSE
**Category:** Control Flow | **Priority:** P1

Routes execution down different branches based on a condition evaluated against any available workflow variable or macro.

**Behavior:**
- Node has two outgoing edge types: `THEN` (condition true) and `ELSE` (condition false).
- The condition is a JMESPath or simple expression evaluated at runtime (e.g., `status_code == 200`, `user_count > 0`).
- If the ELSE branch is not connected, a false condition simply does not proceed (acts as early termination of that path).

**Example:**
```
[Fetch User] → [IF: user.active == true] → THEN → [Send Welcome Email]
                                          → ELSE → [Send Reactivation Notice]
```

**Config Fields:**
- `condition` (string): Expression to evaluate
- `conditionType`: `jmespath` | `simple_compare`

---

### 3.2 TRY / CATCH
**Category:** Control Flow | **Priority:** P1

Wraps a group of nodes. If any node inside the TRY block fails, execution routes to the CATCH branch instead of halting the workflow.

**Behavior:**
- Implemented as two special boundary nodes: `TRY_START` and `TRY_END`.
- Nodes inside the boundary are marked as part of a try-group.
- If any node in the group reaches status `FAILED` or `TIMEOUT`, the CATCH branch is triggered.
- The CATCH branch receives an `error` variable containing the failing node name, status, and error message.

**Example:**
```
[TRY: Call External API → Parse Response → Save to DB]
  → on failure →
[CATCH: Log Error → Notify Ops Channel → Set status = 'partial']
```

**Config Fields:**
- `catchVariableName` (string): Variable name to store error context (default: `_error`)

---

### 3.3 LOOP / ITERATOR
**Category:** Control Flow | **Priority:** P1

Iterates over an array workflow variable and executes a sub-graph once per element. The current element is exposed as a named variable inside the loop body.

**Behavior:**
- Sequential by default (use CONCURRENT LOOP for parallel).
- The current iteration item is exposed via a configurable variable name (e.g., `current_user`).
- The loop index is available as `_loop_index`.
- A `BREAK` condition can be configured to exit the loop early.

**Example:**
```
[Get Users List] → [LOOP over: users, as: current_user]
                       → [Create Jira Ticket for {{current_user.id}}]
                       → [Send Email to {{current_user.email}}]
                   [END LOOP]
                   → [Send Summary Report]
```

**Config Fields:**
- `sourceVariable` (string): The array variable to iterate over
- `itemAlias` (string): Variable name for the current item (default: `_item`)
- `breakCondition` (string, optional): Expression — if true, exits loop early

---

### 3.4 COMMENT / ANNOTATION
**Category:** Designer UX | **Priority:** P1

A non-executable node that places a text label or note on the workflow canvas. Has no effect on execution.

**Behavior:**
- Never creates a task execution record.
- Skipped entirely by the orchestration engine.
- Appears visually distinct (e.g., sticky note style, dashed border).

**Use Cases:**
- Document why a specific branch exists
- Mark phases of a large workflow ("Phase 1: Authentication", "Phase 2: Data Sync")
- Leave TODO notes for collaborators

**Config Fields:**
- `text` (string): The annotation content (supports Markdown)
- `color` (string, optional): Background color for visual grouping

---

### 3.5 NOTIFY
**Category:** Communication | **Priority:** P1

Sends a notification (Slack, Email, Teams, Webhook) at a specific point mid-workflow. Reuses the existing WFA Monitoring notification delivery infrastructure — same sender, new trigger point.

**Distinction from WFA Monitoring Events:**
- WFA Monitoring fires once at workflow completion (outcome event, admin-configured).
- NOTIFY utility fires at any designer-specified point inside the graph, mid-execution, using variables available at that exact moment.

**Behavior:**
- Connects to the existing notification channel configurations.
- Message body supports `{{variable}}` interpolation with workflow variable context at the time of execution.
- Non-blocking — workflow continues after notification is dispatched (fire-and-forget).

**Example:**
```
[LOOP: Process 1000 records] → [NOTIFY: "Batch of 1000 processed. Errors: {{error_count}}"]
```

**Config Fields:**
- `channelType`: `slack` | `email` | `teams` | `webhook`
- `channelId` (string): Reference to configured notification channel
- `message` (string): Message template with `{{variable}}` support
- `subject` (string, optional): Email subject line

---

### 3.6 SWITCH / CASE
**Category:** Control Flow | **Priority:** P2

Multi-branch conditional. Evaluates a variable and routes to the matching case branch. More readable than deeply nested IF/ELSE chains.

**Behavior:**
- Evaluates a single variable against N case values.
- Routes to the matching branch.
- A `DEFAULT` branch handles unmatched cases.

**Example:**
```
[Get Incident] → [SWITCH: incident.type]
                   → CASE "Bug"      → [Create Dev Ticket]
                   → CASE "Outage"   → [Page On-Call + Create P1]
                   → CASE "Request"  → [Create Service Desk Ticket]
                   → DEFAULT         → [Log Unknown Type]
```

**Config Fields:**
- `switchVariable` (string): The variable to evaluate
- `cases` (array): `[{ value: "Bug", label: "Bug Branch" }, ...]`

---

### 3.7 AGGREGATE
**Category:** Data Utility | **Priority:** P2

Collects a specified variable from each LOOP iteration and accumulates it into a single array variable accessible after the loop completes.

**Behavior:**
- Placed inside a LOOP body.
- After each iteration, appends the target variable's current value to the aggregate array.
- After the loop ends, the aggregate array is accessible as a workflow variable.

**Example:**
```
[LOOP over users]
  → [Create Jira Ticket] → [AGGREGATE: ticket_id into created_tickets[]]
[END LOOP]
→ [Send Summary: "Created {{created_tickets.length}} tickets"]
```

**Config Fields:**
- `sourceVariable` (string): Variable to collect from each iteration
- `targetVariable` (string): Name of the resulting array variable

---

### 3.8 TERMINATE
**Category:** Control Flow | **Priority:** P2

Immediately stops the entire workflow and sets a specific final status with an optional message. Used for clean early exits without routing through complex IF/ELSE chains.

**Behavior:**
- Sets workflow execution status to the configured value.
- No subsequent nodes are executed.
- Distinguishable from `FAILED` — can terminate with `SUCCESS` status (e.g., "nothing to process, exit cleanly").

**Example:**
```
[Check Queue] → [IF: queue_size == 0] → THEN → [TERMINATE: SUCCESS, "Queue empty — nothing to process"]
                                       → ELSE → [Process Queue Items...]
```

**Config Fields:**
- `status`: `SUCCESS` | `FAILED` | `WARNING`
- `message` (string): Human-readable reason stored in the execution record

---

### 3.9 WAIT / DELAY
**Category:** Control Flow | **Priority:** P2

Pauses workflow execution for a fixed duration or until a specific datetime before continuing.

**Behavior:**
- The task execution record is created with status `WAITING`.
- A scheduler checks the resume time and transitions it to `PENDING` when the wait period elapses.
- Supports fixed duration (e.g., "wait 5 minutes") and absolute datetime (e.g., "wait until {{retry_after_epoch}}").

**Config Fields:**
- `waitType`: `duration` | `until`
- `durationSeconds` (number): Seconds to wait (for `duration` type)
- `untilVariable` (string): Epoch timestamp variable (for `until` type)

---

### 3.10 CONCURRENT LOOP
**Category:** Performance | **Priority:** P2

A variant of LOOP that executes N iterations simultaneously with a configurable maximum concurrency. Dramatically faster than sequential loops for large datasets.

**Behavior:**
- Same iteration variable exposure as LOOP.
- Launches up to `maxConcurrency` task execution records simultaneously.
- Respects fan-in: downstream nodes wait for ALL iterations to complete.
- AGGREGATE works the same way.

**Config Fields:**
- `sourceVariable` (string): Array to iterate
- `itemAlias` (string): Variable name for current item
- `maxConcurrency` (number): Max simultaneous iterations (default: 5)

---

### 3.11 ASSERT / GATE
**Category:** Control Flow | **Priority:** P3

Evaluates a condition. If true, execution passes through. If false, the workflow fails immediately with a descriptive error. Acts as a runtime pre-condition guard.

**Example:**
```
[Fetch Records] → [ASSERT: record_count > 0, "No records returned — data source may be empty"]
```

**Config Fields:**
- `condition` (string): Expression to evaluate
- `failMessage` (string): Error message if assertion fails
- `failStatus`: `FAILED` | `WARNING` (default: `FAILED`)

---

### 3.12 RATE LIMITER
**Category:** Ops | **Priority:** P3

Enforces a maximum throughput for a section of the workflow. Used inside loops to prevent hitting external API rate limits.

**Behavior:**
- Placed inside a LOOP body.
- After each iteration, checks whether the rate limit has been reached.
- If yes, inserts a `WAIT` equal to the remainder of the current time window before continuing.

**Config Fields:**
- `maxCallsPerWindow` (number): e.g., `10`
- `windowSeconds` (number): e.g., `1` (means max 10 per second)

---

### 3.13 APPROVAL GATE
**Category:** Human-in-the-Loop | **Priority:** P3

Pauses workflow execution and sends a notification to a named approver. The workflow resumes only when the approver explicitly approves or rejects via the Restmon UI or a response webhook.

**Behavior:**
- Creates a `WAITING_APPROVAL` execution record.
- Sends notification to the specified approver channel with Approve/Reject action links.
- Exposes `_approval.status` (`APPROVED` | `REJECTED`) and `_approval.comment` in the workflow context after resume.
- Optional timeout: auto-reject or auto-approve after N hours.

**Config Fields:**
- `approverChannel` (string): Notification channel reference
- `message` (string): Request message with `{{variable}}` support
- `timeoutHours` (number, optional): Auto-decision after timeout
- `timeoutAction`: `APPROVE` | `REJECT` | `ESCALATE`

---

### 3.14 WEBHOOK WAIT
**Category:** Event-Driven | **Priority:** P3

Pauses workflow execution and generates a unique inbound webhook URL. The workflow resumes when a POST request is received at that URL, with the request body available as a workflow variable.

**Behavior:**
- Useful for triggering continuation from external systems (e.g., wait for a CI/CD pipeline to call back when it finishes).
- The generated URL includes a one-time token tied to the execution ID.
- Optional timeout after which the workflow fails with `TIMEOUT`.

**Config Fields:**
- `responseVariable` (string): Variable name to store the inbound webhook body
- `timeoutMinutes` (number, optional)

---

### 3.15 CHECKPOINT / RESUME
**Category:** Resilience | **Priority:** P3

Persists the full workflow variable state to durable storage at a specific point. If the workflow engine restarts or crashes, the workflow can resume from the last checkpoint rather than restarting from scratch.

**Behavior:**
- Serializes all current `workflowVars` and the execution graph state to the database.
- The scheduler checks for `CHECKPOINT_RECOVERED` executions on startup and re-queues them.

**Config Fields:**
- `checkpointName` (string, optional): Human-readable label for the checkpoint

---

### 3.16 DEDUP / FILTER
**Category:** Data Utility | **Priority:** P3

Removes duplicate entries or filters an array variable in-place using a simple expression, without requiring a full advanced YAML transformer.

**Config Fields:**
- `sourceVariable` (string): The array to process
- `mode`: `dedup` | `filter`
- `dedupKey` (string, for dedup): The property to deduplicate on (e.g., `id`)
- `filterCondition` (string, for filter): Expression each item must satisfy

---

### 3.17 SUB-FLOW BOOKMARK
**Category:** Designer UX | **Priority:** P4

A visual region/group box that wraps a set of nodes on the canvas and displays a label. Non-executable — purely a designer aid for organizing complex workflows into named phases.

**Config Fields:**
- `label` (string): Phase name (e.g., "Phase 1: Authentication")
- `color` (string, optional): Border/background color

---

## 4. Architecture Notes

### Reusing Existing Infrastructure

| Utility Node | Reuses |
|---|---|
| NOTIFY | WFA Monitoring notification sender service |
| WAIT / DELAY | Existing task execution polling mechanism with a `resumeAt` timestamp |
| APPROVAL GATE | WFA notification sender + new inbound approval endpoint |
| WEBHOOK WAIT | New inbound webhook endpoint generating execution-scoped tokens |
| CONCURRENT LOOP | Worker polling + existing fan-in logic already in orchestration |

### Engine Changes Required

- **New `taskType` values**: `IF`, `SWITCH`, `LOOP`, `CONCURRENT_LOOP`, `TRY`, `CATCH`, `TERMINATE`, `WAIT`, `NOTIFY`, `AGGREGATE`, `ASSERT`, `APPROVE`, `WEBHOOK_WAIT`, `CHECKPOINT`, `COMMENT`
- **Orchestration engine** (`handleWorkflowOrchestration`) needs to handle each new type's routing logic server-side.
- **Worker** only needs to handle types that require external compute. Types like `COMMENT`, `TERMINATE`, `ASSERT`, and `WAIT` can be resolved entirely server-side by the orchestrator without dispatching to a worker.

---

## 5. Implementation Phases

### Phase 1 — Core Control Flow (P1)
- IF / THEN / ELSE
- TRY / CATCH
- LOOP / ITERATOR
- COMMENT / ANNOTATION
- NOTIFY (reusing existing sender)

### Phase 2 — Enriched Orchestration (P2)
- SWITCH / CASE
- AGGREGATE
- TERMINATE
- WAIT / DELAY
- CONCURRENT LOOP

### Phase 3 — Enterprise Patterns (P3)
- ASSERT / GATE
- RATE LIMITER
- APPROVAL GATE
- WEBHOOK WAIT
- CHECKPOINT / RESUME
- DEDUP / FILTER

### Phase 4 — Designer Polish (P4)
- SUB-FLOW BOOKMARK
