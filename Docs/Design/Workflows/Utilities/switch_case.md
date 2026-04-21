# Design: SWITCH / CASE Utility Node

Status: **Proposed** | Priority: **P2** | Version: **1.0**
Date: 20-April-2026
Parent: [Workflow Utility Nodes](../workflow_utility_nodes.md)

---

## 1. Overview

The `SWITCH` utility node (also known as a "Router") provides a multi-branch conditional logic path. It evaluates a single source variable against multiple configured "Cases" and routes execution to the matching exit handle.

This node is the "clean" alternative to the `IF` node when a developer needs to handle 3+ different outcomes. It prevents "If-Else Hell" and makes the workflow canvas significantly more readable.

**Design Goals:**
- **Compact Multi-Branching**: One node, many exits.
- **Advanced Matching**: Supports exact values, Regex, and numeric ranges.
- **Default Fallback**: Guaranteed path for unhandled values.
- **Dynamic Designer UX**: Exits appear as labeled handles on the canvas.

---

## 2. Visual Representation

Unlike standard nodes, the `SWITCH` node expands vertically as cases are added. Each case has its own **Exit Source Handle** on the right side.

```
                  ┌─────────────────┐
                  │ SWITCH: priority │── [High] ──▶ [P1 Slack Alert]
                  │                  │
[Get Incident] ──▶│                  │── [Med]  ──▶ [Email Support]
                  │                  │
                  │                  │── [Low]  ──▶ [Log to DB]
                  │                  │
                  │                  │── [Def]  ──▶ [Audit Log]
                  └─────────────────┘
```

**Node UI in Designer:**
- **Shape**: Rectangular with a distinct "Router" header.
- **Colors**: Blue/Indigo scheme.
- **Handles**: Labeled right-side handles representing each case.

---

## 3. Configuration & Match Operators

Standard behavior evaluates `Source Variable <Operator> Case Value`.

### 3.1 Operators Supported

| Operator | Use Case |
|---|---|
| `Equals` (Default) | Exact matching for strings/numbers. |
| `Not Equals` | Excluding specific values. |
| `Matches (Regex)` | Pattern matching (e.g., `/^INC-[0-9]+/`). |
| `Greater/Less Than` | Numeric threshold routing. |
| `Contains` | Checking if a string or array includes a value. |
| `In List` | Matching against a comma-separated list of values. |

### 3.2 The "Default" Case
Every Switch node has an implicit **Default** case. This is executed if no other cases match the source variable. It ensures the workflow never gets "stuck" without a path.

---

## 4. How It Works (Engine Logic)

1. **Resolution**: The orchestrator resolves the `sourceVariable` from the current context.
2. **Evaluation**: It iterates through the `cases[]` array in the order they were defined.
3. **Execution**:
    - The **first** case that evaluates to `true` is selected.
    - The orchestrator triggers the downstream nodes connected to that specific `handleId`.
    - If no cases match, it triggers the edge connected to the `default` handle.
4. **Non-Blocking**: Only one branch is ever taken. The Switch does **not** multicast to all matching branches unless explicitly configured to "Evaluate All" (though standard behavior is "Break on First Match").

---

## 5. Configuration Options

| Field | Default | Description |
|---|---|---|
| `label` | `"Switch"` | Label shown on the canvas |
| `sourceVariable` | `null` | The workflow variable to evaluate (e.g., `{{incident.severity}}`) |
| `cases` | `[]` | Array of `{ id: "uuid", value: any, operator: "==", label: "Success" }` |
| `evaluationMode` | `"FIRST_MATCH"`| `FIRST_MATCH` \| `ALL_MATCHES` (Default: First) |

---

## 6. Implementation Detail

### 6.1 Flow Logic
The `edges` for a Switch node must contain a `sourceHandle` property that matches the `id` of the case.
```json
{
  "source": "switch-node-001",
  "sourceHandle": "case-uuid-123",
  "target": "p1-handler-node"
}
```

### 6.2 Designer ReactFlow
Implementing this requires a custom node type in ReactFlow with multiple `<Handle />` components, each mapped to the internal state of the `cases` array.

---

## 7. Comparison: IF vs. SWITCH

| Feature | IF / THEN / ELSE | SWITCH / CASE |
|---|---|---|
| **Outcomes** | 2 (Boolean) | N (Plural) |
| **Logic** | Complex expression | Single variable comparison |
| **Canvas UX** | Binary tree | Waterfall / Router |
| **Best For** | Yes/No decisions | Category/Status routing |
