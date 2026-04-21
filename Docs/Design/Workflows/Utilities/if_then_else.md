# Design: IF / THEN / ELSE Utility Node

Status: **Proposed** | Priority: **P1** | Version: **1.0**
Date: 16-April-2026
Parent: [Workflow Utility Nodes](../workflow_utility_nodes.md)

---

## 1. Overview

The IF/THEN/ELSE node is the foundational conditional branching primitive for the NovaTayan workflow engine. It evaluates one or more conditions against the current workflow variable context and routes execution down either the THEN or ELSE path.

**Design goals:**
- Simple enough for non-developers using the guided builder
- Powerful enough for engineers using raw expressions
- Fully observable — every decision is inspectable after the fact
- Zero-worker execution — evaluated entirely server-side by the orchestrator

---

## 2. Visual Representation

The IF node is rendered as a **diamond shape** on the workflow canvas — the universal flowchart convention for decision points.

```
            [Fetch User]  
                 │
             ◇ IF ◇          ← Amber/yellow diamond, condition shown below
         user.active == true
            /         \
     [THEN]             [ELSE]
  (green edge)        (red edge)
       │                    │
[Send Welcome]     [Send Reactivation]
```

**Visual rules:**
- Diamond color: **Amber** (distinct from task blue, VMA purple, CWF teal)
- THEN outgoing edge: **Green** with "THEN" label
- ELSE outgoing edge: **Red** with "ELSE" label
- Condition expression shown as a subtitle beneath the node label
- ELSE edge is **optional** — if not connected, a false condition simply stops that execution path cleanly

---

## 3. How It Works

### 3.1 Execution Model

The IF node is **resolved entirely server-side by the orchestration engine** — it is never dispatched to a worker. This makes it instantaneous and removes any dependency on worker availability.

**Step-by-step flow:**

```
1. Orchestrator detects next node has taskType: 'IF'
2. Gathers current workflowVars + macros context
3. Evaluates all condition groups (AND / OR logic)
4. Determines branchResult: 'THEN' | 'ELSE'
5. Creates a TaskExecution record for the IF node with status: 'SUCCESS'
         and result: { branchResult, conditionExpression, resolvedValues }
6. Iterates outgoing edges:
         - Edge with condition 'ON_THEN' fires if branchResult === 'THEN'
         - Edge with condition 'ON_ELSE' fires if branchResult === 'ELSE'
7. Normal orchestration fan-in continues from triggered branch nodes
```

### 3.2 Integration With Existing Edge Conditions

NovaTayan already evaluates edge conditions in `handleWorkflowOrchestration`:

```typescript
// Existing:
condition === 'ALWAYS'
condition === 'ON_SUCCESS' && status === 'SUCCESS'
condition === 'ON_FAILURE' && status !== 'SUCCESS'

// New — added for IF node:
condition === 'ON_THEN' && result.branchResult === 'THEN'
condition === 'ON_ELSE' && result.branchResult === 'ELSE'
```

This is a **minimal, non-breaking extension** to the existing mechanism.

---

## 4. Condition Expression System

### 4.1 Two Modes

#### Simple / Guided Mode (default)
A structured row-based builder. Each row is:
```
[ Variable Picker ▼ ]  [ Operator ▼ ]  [ Value Input ]
```

**Supported operators:**

| Operator | Meaning |
|---|---|
| `==` | Equals |
| `!=` | Not equals |
| `>` `>=` | Greater than / or equal |
| `<` `<=` | Less than / or equal |
| `contains` | String contains / array includes |
| `not_contains` | String does not contain |
| `is_empty` | Value is null, undefined, `""`, or `[]` |
| `is_not_empty` | Value is not null/empty |
| `starts_with` | String starts with value |
| `ends_with` | String ends with value |
| `matches_regex` | Value matches provided regex pattern |

#### Raw Expression Mode (advanced)
Toggle to a free-text field supporting JMESPath expressions for complex multi-field conditions:
```
length(items[?status=='active']) > 0
```

### 4.2 Multiple Conditions (AND / OR Groups)

Conditions can be grouped. All conditions within a group are evaluated with AND. Groups themselves are evaluated with OR.

**Example — "Premium active user OR override flag set":**
```
GROUP 1 (conditions joined with AND):
  user.active     ==    true
  account_type    ==    "premium"

OR

GROUP 2 (conditions joined with AND):
  override_flag   ==    true
```

This covers the vast majority of real-world branching logic without requiring nested IF chains.

**Data model for condition groups:**
```json
"conditionGroups": [
  {
    "operator": "AND",
    "conditions": [
      { "variable": "user.active", "op": "==", "value": true },
      { "variable": "account_type", "op": "==", "value": "premium" }
    ]
  },
  {
    "operator": "AND",
    "conditions": [
      { "variable": "override_flag", "op": "==", "value": true }
    ]
  }
]
```

Groups are joined by OR implicitly.

### 4.3 Null / Missing Variable Handling

Required configuration controlling what happens if a referenced variable does not exist in the current workflow context:

| Setting | Behavior |
|---|---|
| `ELSE` *(default)* | Route to ELSE branch — treats missing as false |
| `FAIL` | Fail the workflow with a descriptive error message |
| `THEN` | Route to THEN branch — treat missing as truthy |

---

## 5. Live Condition Tester (Designer UX)

Available directly in the IF node config panel — identical concept to the Transformer Test Lab.

**Features:**
- Paste any sample JSON payload as mock workflow variables
- The tester resolves all condition groups in real-time against the mock data
- Shows live result: **"✅ THEN"** or **"❌ ELSE"**
- Shows the resolved value of each variable referenced in the conditions
- "Use Last Execution Data" button — pulls the last successful workflow execution's variable state as the mock input

**Example tester output:**
```
Condition: user.active == true
  Resolved: user.active → true
  Result: PASSED ✅

Condition: account_type == "premium"
  Resolved: account_type → "premium"
  Result: PASSED ✅

GROUP 1 → TRUE
→ Branch taken: THEN ✅
```

---

## 6. Inspector Visualization (Runtime Observability)

### 6.1 Canvas Branch Highlighting

In the Workflow Inspector (WFI) canvas after an execution:

- The **taken branch edge is rendered in bold green** with an animated flow indicator
- The **not-taken branch edge is desaturated/gray** with a dashed stroke
- The IF diamond node shows a small **"THEN" or "ELSE" badge** in its corner

This makes it immediately obvious which decision path was taken without needing to open any panels.

### 6.2 Execution Detail Panel

When the IF node is clicked in the Inspector, the detail panel shows:

```
Node:         Is User Active?
Type:         IF / Condition Gate
Status:       SUCCESS (resolved in 2ms)
Branch Taken: THEN ✅

Condition Evaluation:
┌──────────────────────────────────────────────────────┐
│ user.active == true                                  │
│   Resolved value: true                               │
│   Result: PASSED ✅                                  │
├──────────────────────────────────────────────────────┤
│ account_type == "premium"                            │
│   Resolved value: "premium"                          │
│   Result: PASSED ✅                                  │
└──────────────────────────────────────────────────────┘
GROUP 1 → TRUE → Branch: THEN
```

### 6.3 Execution Record Storage

The TaskExecution result JSON for an IF node stores the full evaluation context for historical debugging:

```json
{
  "nodeType": "IF",
  "conditionExpression": "user.active == true AND account_type == 'premium'",
  "conditionGroups": [...],
  "resolvedValues": {
    "user.active": true,
    "account_type": "premium"
  },
  "branchResult": "THEN",
  "evaluatedAt": "2026-04-16T14:20:00.123Z",
  "durationMs": 2
}
```

---

## 7. Designer Interaction Flow

### Adding an IF Node
1. Open the Workflow Designer toolbox
2. Drag the **IF diamond** node onto the canvas
3. Click node to open the config panel:
   - Enter a human-readable **label** (e.g., "Is User Active?")
   - Use the **guided condition builder** to add condition rows
   - Optionally add more condition groups (OR logic between groups)
   - Set **Missing Variable Behavior**
   - Run the **Live Tester** to validate
4. Click Save

### Wiring Branches
1. Hover the IF diamond — connection handles appear on all four sides
2. Drag a connection from the diamond
3. A **popup appears**: *"Select branch: THEN or ELSE"*
4. Select THEN → edge renders green with "THEN" label
5. Select ELSE → edge renders red with "ELSE" label
6. Connect ELSE is optional

### Designer Constraints / Validation
- Maximum **one THEN edge** and **one ELSE edge** may originate from an IF node
- A warning is shown if no THEN edge is connected (the IF would never do anything on a true result)
- No constraint on what connects to the THEN/ELSE targets — they can be any node type including another IF

---

## 8. Data Model

### Node Schema (stored in `workflow.nodes[]`)

```json
{
  "id": "node-if-001",
  "type": "IF",
  "taskType": "IF",
  "label": "Is User Active?",
  "position": { "x": 400, "y": 200 },
  "conditionMode": "simple",
  "conditionGroups": [
    {
      "operator": "AND",
      "conditions": [
        { "variable": "user.active", "op": "==", "value": true, "valueType": "boolean" },
        { "variable": "account_type", "op": "==", "value": "premium", "valueType": "string" }
      ]
    },
    {
      "operator": "AND",
      "conditions": [
        { "variable": "override_flag", "op": "==", "value": true, "valueType": "boolean" }
      ]
    }
  ],
  "rawExpression": null,
  "onMissingVariable": "ELSE"
}
```

### Edge Schema (stored in `workflow.edges[]`)

```json
[
  {
    "id": "edge-then-001",
    "source": "node-if-001",
    "target": "node-welcome-email",
    "condition": "ON_THEN",
    "label": "THEN",
    "style": { "stroke": "#22c55e", "strokeWidth": 2 }
  },
  {
    "id": "edge-else-001",
    "source": "node-if-001",
    "target": "node-reactivation",
    "condition": "ON_ELSE",
    "label": "ELSE",
    "style": { "stroke": "#ef4444", "strokeWidth": 2 }
  }
]
```

---

## 9. Codebase Changes Required

| Layer | File | Change |
|---|---|---|
| **Orchestration Engine** | `worker.service.ts` → `handleWorkflowOrchestration` | Add server-side IF resolver before the dispatch loop. Evaluates conditions, writes task execution record with `branchResult`, continues edge routing. |
| **Edge Condition Checker** | `worker.service.ts` → `statusMatch` block | Add `ON_THEN` and `ON_ELSE` cases |
| **Condition Evaluator** | `apps/api/src/worker/condition-evaluator.ts` *(new file)* | Pure function: `evaluateConditionGroups(groups, workflowVars, macros): 'THEN' \| 'ELSE'` |
| **Workflow DTO** | `workflow.dto.ts` | Accept `IF` as valid `taskType`, add `conditionGroups` and `conditionMode` to node schema |
| **ReactFlow Canvas** | New component: `IfNode.tsx` | Diamond SVG shape, amber color, condition subtitle |
| **Edge Type Picker** | `WorkflowDesigner.tsx` | On drag-from-IF-node, show THEN/ELSE branch picker popup |
| **Config Panel** | New component: `IfNodeConfigPanel.tsx` | Guided condition builder, raw expression toggle, live tester, missing variable setting |
| **Inspector WFI** | `WFICanvas.tsx` / `ExecutionDetailPanel.tsx` | Branch highlighting on edges, THEN/ELSE badge on IF node, condition evaluation detail view |

---

## 10. Edge Cases & Decisions

| Scenario | Behavior |
|---|---|
| **No ELSE edge connected, condition is false** | Execution on that path stops cleanly. Workflow completes if no other active branches. |
| **Missing referenced variable** | Controlled by `onMissingVariable` setting (ELSE / FAIL / THEN) |
| **IF node is the entry (start) node** | Valid — condition is evaluated using initial workflow variables / trigger data |
| **Two IFs in sequence on the same branch** | Natural graph traversal — each evaluates independently |
| **IF → ELSE leads back to a shared node (diamond join)** | Already handled by fan-in logic. The shared target node waits for both branches only if both are connected to it. If only one branch fires, it proceeds immediately. |
| **Condition expression syntax error** | Caught at save time by the condition validator. Workflow cannot be saved with an invalid expression. |
| **Both THEN and ELSE connect to the same target node** | Valid. Both edges exist. But since only one fires per execution, the target node will be triggered once, not twice. |

---

## 11. Future Extensions (Out of Scope for V1)

- **ELSE IF chaining** — Not a new node type; achieved naturally by connecting the ELSE edge to another IF node. The canvas should visually encourage this pattern by auto-labeling the compound chain.
- **Condition Templates** — Save a condition group as a reusable template (e.g., "Is HTTP Success"), insertable into any IF node's builder.
- **AI-Assisted Condition Builder** — The Copilot could suggest likely conditions based on the upstream node's API response schema.
