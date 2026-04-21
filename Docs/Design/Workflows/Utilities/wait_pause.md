# Design: WAIT / PAUSE Utility Node

Status: **Proposed** | Priority: **P2** | Version: **1.0**
Date: 20-April-2026
Parent: [Workflow Utility Nodes](../workflow_utility_nodes.md)

---

## 1. Overview

The `WAIT` utility node (also known as `PAUSE`) suspends the execution of a specific path in a workflow for a specified duration or until a specific timestamp is reached.

Unlike a simple "thread sleep," NovaTayan's WAIT node is **asynchronous and non-blocking**. It unloads the workflow state and schedules a wake-up event in the system scheduler, ensuring that thousands of workflows can "wait" simultaneously without consuming CPU or Worker resources.

**Design Goals:**
- **Resource Efficiency**: No active worker threads during the wait period.
- **Precision**: Support for both relative durations and absolute timestamps.
- **Observability**: Real-time countdowns in the Workflow Inspector.
- **Control**: Ability for operators to manually bypass the wait.

---

## 2. Visual Representation

The `WAIT` node is a compact utility node with a **Timer icon** and an **Amber/Orange** color scheme to indicate a "paused" state.

```
[POST: Submit Ticket]
        │
        ▼
[WAIT: 60 Seconds]  ← Status: WAITING (⏳ 00:42 remaining)
        │
        ▼
[GET: Check Ticket Status]
```

**Node UI in Designer:**
- **Icon**: `Timer` (from Lucide)
- **Status Badge**: During execution, shows a pulsing countdown: `⏳ 04:59`.

---

## 3. Configuration Modes

Users can choose from three trigger modes:

### 3.1 Duration (Relative)
Wait for a fixed amount of time from the moment the node is reached.
- **Config**: `amount` (number), `unit` (Seconds | Minutes | Hours).
- **Example**: "Wait 5 Minutes".

### 3.2 Until Time (Absolute)
Wait until a specific wall-clock time.
- **Config**: `time` (HH:mm), `timezone` (default: UTC).
- **Example**: "Wait until 08:00 AM". If reached at 09:00 AM, it proceeds immediately.

### 3.3 Dynamic (Variable-based)
Wait for a value resolved from a workflow variable.
- **Config**: `expression` (string).
- **Format Support**: 
    - Number (milliseconds)
    - ISO Timestamp String
    - Cron-like strings (Future)
- **Example**: `{{Task.Fetch_Rate_Limit.headers.X-Retry-After}}`.

---

## 4. How It Works (Engine Logic)

### 4.1 Transition to WAITING
When the orchestrator reaches a WAIT node:
1. It calculates the `resumeAt` timestamp based on the configuration.
2. If `resumeAt` <= `now`, the node completes immediately (SUCCESS).
3. Otherwise:
    - The node's `TaskExecution` status is set to `WAITING`.
    - The orchestrator **stops processing** that branch.
    - A "Resume Event" is registered in the `SchedulerService`.

### 4.2 The Wake-Up Call
1. The `SchedulerService` monitors pending resume events.
2. When `now >= resumeAt`, the scheduler:
    - Marks the WAIT node as `SUCCESS`.
    - Triggers the `handleWorkflowOrchestration` logic for that execution ID to resume the DAG traversal.

### 4.3 Manual Resume (Operator Override)
In the Workflow Inspector, an operator can click **"Resume Now"** on a waiting node.
- Action: Marks the node as `SUCCESS` and triggers the orchestrator immediately.
- Result: The scheduled event is cancelled or ignored.

---

## 5. Configuration Options

| Field | Default | Description |
|---|---|---|
| `label` | `"Wait"` | Label shown on the canvas |
| `mode` | `"DURATION"` | `DURATION` \| `UNTIL_TIME` \| `DYNAMIC` |
| `durationAmount` | `60` | Number of units for DURATION mode |
| `durationUnit` | `"SECONDS"` | `SECONDS` \| `MINUTES` \| `HOURS` |
| `untilTime` | `null` | "HH:mm" for UNTIL_TIME mode |
| `expression` | `null` | Template string for DYNAMIC mode |
| `maxWaitLimit` | `24h` | Safety cap to prevent infinite or multi-day zombies |

---

## 6. Implementation Detail

### 6.1 Database Status
We will use the existing `PENDING` or a new `WAITING` status in the `TaskExecution` table.
- Recommendation: Use `WAITING` to distinguish from tasks waiting for a worker.

### 6.2 Scheduler Integration
The `WAIT` node will create a record in a new `ScheduledResume` table:
```prisma
model ScheduledResume {
  id                  String   @id @default(uuid())
  taskExecutionId     String   @unique
  workflowExecutionId String
  resumeAt           DateTime
  processed          Boolean  @default(false)
}
```

---

## 7. Future Extensions
- **Wait for Signal**: Wait until an external webhook or another workflow sends a "Signal" to this specific execution (Advanced).
- **Wait for Variable Change**: Re-evaluate a condition periodically until it returns true (Polling pattern).
- **Wait for Human Approval**: A dedicated variant that waits for a user to click a link in an email.
