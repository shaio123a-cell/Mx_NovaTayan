# Design: COMMENT Utility Node

Status: **Proposed** | Priority: **P2** | Version: **1.0**
Date: 20-April-2026
Parent: [Workflow Utility Nodes](../workflow_utility_nodes.md)

---

## 1. Overview

The `COMMENT` utility node is a purely visual annotation tool. It allows workflow designers to document logic, leave instructions for colleagues, or tag specific areas of a massive DAG directly on the canvas.

**Design Goals:**
- **Zero Runtime Impact**: The orchestrator ignores these nodes entirely.
- **Rich Documentation**: Supports Markdown for formatting.
- **Visual Grouping**: Can act as a background container for organizational purposes.
- **Ease of Use**: Resizable and color-coded.

---

## 2. Visual Representation

Unlike functional nodes, `COMMENT` nodes have no input or output handles. They appear as resizable "Sticky Notes" or "Annotation Boxes".

```
[Fetch Data]
     │
     ▼
┌─────────────────────────────────┐
│  💡 PRO TIP                     │
│  The API below is rate-limited  │
│  to 5 calls/sec. Keep the delay │
│  node at 200ms.                 │
└─────────────────────────────────┘
     │
     ▼
[Process Data]
```

**Node UI in Designer:**
- **Style**: Subtle dashed border or "Post-it" shadow.
- **Markdown Support**: Renders headers, lists, and links.
- **Opacity**: Adjustable (to allow background grouping).

---

## 3. Configuration Options

| Field | Default | Description |
|---|---|---|
| `label` | `"Note"` | Title shown at the top of the box |
| `content` | `""` | The body text (Supports Markdown) |
| `color` | `"YELLOW"` | `YELLOW` \| `BLUE` \| `GREEN` \| `RED` \| `GRAY` |
| `fontSize` | `14` | Adjust text size for readability |
| `showInWFI` | `true` | If true, the note also appears in the Inspector (useful for instructions) |

---

## 4. How It Works (Implementation)

### 4.1 Orchestrator Bypass
In `worker.service.ts`, the orchestration engine logic that identifies start nodes or downstream targets will explicitly filter out any node with `taskType: 'COMMENT'`.

```typescript
const nodesToProcess = nodes.filter(n => n.taskType !== 'COMMENT');
```

### 4.2 Designer Logic
- **Drag-and-Resize**: Integrated with ReactFlow's `NodeResizer`.
- **Keyboard Shortcuts**: `N` key to drop a new note at cursor position (Future).

### 4.3 Background Layering
Users can set the `zIndex` of a comment node. By setting a low `zIndex` and a large size, the comment node can act as a **Section Box** that sits behind functional nodes to group them visually.

---

## 5. Summary of Use Cases

1. **TODOs**: "Finish error handling for this node." (Yellow)
2. **Business Requirements**: Linking to a Jira ticket or design spec. (Blue)
3. **Execution Safety**: "⚠️ Warning: Do not change this timeout without Ops approval." (Red)
4. **Onboarding**: "Step 1: Authenticate | Step 2: Extract | Step 3: Load." (Green)
