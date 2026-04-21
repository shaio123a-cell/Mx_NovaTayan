# Design: NOTIFY Utility Node

Status: **Proposed** | Priority: **P2** | Version: **1.0**
Date: 20-April-2026
Parent: [Workflow Utility Nodes](../workflow_utility_nodes.md)

---

## 1. Overview

The `NOTIFY` utility node allows a workflow to trigger another workflow (typically a notification-specific workflow) **mid-execution** without waiting for it to complete.

While NovaTayan already supports "Event Triggers" (notifications at the end of a workflow), the `NOTIFY` node provides the flexibility to send alerts at any point in the DAG, allowing for granular progress updates or conditional alerts (e.g., inside an IF branch).

**Design Goals:**
- **Non-blocking**: The orchestrator fires the notification and proceeds to the next node immediately.
- **Reusable logic**: Leverages the existing notification workflow pattern where "Workflows = Notification Handlers".
- **Transparent**: The notification workflow receives full context of the source workflow via metadata variables.

---

## 2. Visual Representation

The `NOTIFY` node is a compact utility node with a **Bell icon** and a **Violet/lavender** color scheme to distinguish it from standard HTTP tasks (blue) or standard sub-workflows (blue parallelograms).

```
[Fetch Data]
     │
     ▼
[NOTIFY: "Data Fetch Complete"]  ← Fires Slack workflow and continues
     │
     ▼
[Process Data]
```

**Node UI in Designer:**
- **Icon**: `Bell` (from Lucide)
- **Label**: User-defined or "Notify: [Workflow Name]"
- **Style**: Standard node shape with rounded corners.

---

## 3. How It Works

### 3.1 Orchestration Logic
When the engine encounters a `NOTIFY` node:
1. It resolves the `inputMapping` against the current workflow context.
2. It calls `workflowsService.enqueueExecution(...)` with `triggeredBy: 'SIGNAL'`.
3. It **marks the NOTIFY node as SUCCESS immediately** after the trigger is enqueued.
4. It proceeds to downstream nodes without waiting for the triggered workflow to start or finish.

### 3.2 Data Context
The triggered notification workflow automatically receives the following "Reserved Variables" in its initial context:

| Variable | Description |
|---|---|
| `__source_workflow_id` | ID of the principal workflow |
| `__source_execution_id` | ID of the principal execution |
| `__source_node_id` | ID of the NOTIFY node that fired the trigger |
| `__source_inspector_url` | **Deep-link** directly to this execution in the WFI |
| `__source_variables` | A snapshot of the principal workflow's variables at fire time |
| `{{inputs}}` | Any user-mapped variables from the NOTIFY node config |

---

## 4. Automatic Deep-Linking (Best-in-Class)

To ensure notifications are actionable, NovaTayan automatically generates a signed **Inspector URL** for every notification.

- **URL Format**: `https://{portal_url}/workflows/execution/{id}?node={nodeId}`
- **Usage**: The target notification workflow can use `{{__source_inspector_url}}` directly in its Slack/Email templates.
- **Value**: One-click troubleshooting. The user receive an alert and is taken exactly to the context where the alert was fired.

---

## 5. Configuration Options

| Field | Default | Description |
|---|---|---|
| `label` | `"Notify"` | Label shown on the canvas |
| `workflowId` | *(required)* | Searchable picker for the target notification workflow |
| `inputMapping` | `{}` | Variable mapper (Source Expression → Target Input) |
| `tagHandling` | `"DEFAULT"` | `DEFAULT` (Inherit) \| `PIN_TO_WORKER` |

---

## 6. Why Use NOTIFY vs. Event Triggers?

| Use Case | Event Trigger (Existing) | NOTIFY Node (New) |
|---|---|---|
| **End of Workflow Success** | ✅ Yes | ❌ Redundant |
| **End of Workflow Failure** | ✅ Yes | ❌ Redundant |
| **Progress Updates** (e.g., "50% done") | ❌ No | ✅ Yes |
| **Conditional Notifications** | ❌ No | ✅ Yes (place inside IF branch) |
| **Error Handling (Try/Catch)** | ❌ No | ✅ Yes (trigger on CATCH edge) |

---

## 7. Codebase Changes Required

### 6.1 Orchestration Engine
Update `worker.service.ts` → `handleWorkflowOrchestration`:
```typescript
if (nextNode.taskType === 'NOTIFY') {
  // 1. Resolve inputs
  const resolvedInputs = resolveInputs(nextNode.inputMapping);
  
  // 2. Fire and forget
  await this.workflowsService.enqueueExecution(
    nextNode.workflowId, 
    'SIGNAL', 
    'node-notify', 
    { ...resolvedInputs, __source_node_id: nextNode.id }, 
    workflowExecutionId
  );
  
  // 3. Mark as SUCCESS and continue DAG traversal
  await this.completeExecution(notifyTaskExec.id, { status: 200, data: 'Notification fired' });
}
```

### 6.2 Designer UI
- Create `NotifyNode.tsx` ReactFlow component.
- Add "Notify" to the Utility section of the toolbox.
- Reuse `WorkflowPicker` and `VariableMappingShelf` from the Child Workflow (CWF) drawer.

---

## 8. Future Extensions
- **Multi-Notify**: Trigger multiple workflows from a single node.
- **Provider Shortcuts**: Built-in support for "Simple Slack/Email" without needing a separate workflow (for quick-and-dirty alerts).
