# Workflow Administration Panel

In the designer, create a **Workflow Administration Panel** that allows defining workflow‑level administrative elements.  
When clicked, a **shelf panel** opens where the user can configure these settings.

The panel contains three tabs:

- **Scheduling**
- **Variables**
- **Notifications**

---

# Variables Tab (Input & Output Variables)

The Variables tab contains two sections:

- **Input Variables**
- **Output Variables**

---

## Input Variables

Input Variables define the external values required for the workflow.  
These behave similarly to task output processing:

- Add / Remove / Update variable  
- Direct Value  
- Pick Variable  
- Config Transformer  

### Default Value Behavior — “Use Parent Workflow Input” Toggle

Each Input Variable has a toggle:

**[✓] Use Parent Workflow Input**

- When **ON**:
  - The variable receives its value directly from the **parent workflow**.
  - No other configuration fields are shown.

- When **OFF**:
  - The variable becomes fully configurable using:
    - Direct Value
    - Pick Variable
    - Config Transformer
  - Inside Config Transformer, include:
    - Standard transformer options  
    - **“Use Parent Workflow Input”** (only for workflow Input Variables)

This improves discoverability and sets a clear default behavior.

---

## Output Variables

Output Variables act as the workflow’s **return values**.

Capabilities:
- Add / Remove / Update variable
- Direct Value
- Pick Variable
- Config Transformer

Variable picker includes:
- All variables from tasks inside this workflow
- All overlay variables
- All global variables
- Macros & utility helpers

The Output Variables are returned to the **parent workflow** after execution completes.

---

# Notifications Tab

This tab manages workflow-level notifications.

## Notification List (CRUD)
Notifications are represented as a list supporting:
- Add
- Update
- Delete

## Notification Type
When adding a notification, the user selects a **Notification Type**.  
For now, the only type is:

- **Workflow Notification**

### Workflow Notification Behavior

- User selects a workflow to execute.
- A panel displays that workflow's **input variables**.
- User can only set values for these inputs — no renaming or adding.

Input variable values can be defined using:
- Direct Value
- Pick Variable
- Config Transformer

Variable picker includes:
- All variables in tasks of this workflow
- Overlay variables  
- Global variables  
- Macros & utility helpers  

If a Config Transformer is used, its value is transformed **before** sending the input to the notification workflow.

### Notification Triggers

Triggers available:
- **Workflow Completion**
- **On Success**
- **On Failure**
- **On Cancelled**

Internal architecture follows:
### Notification Status & Inspect Panel

- The Workflow Inspect panel includes a **Notifications** button.
- Clicking opens a shelf showing:
  - Notification executions
  - Their current status
  - Ability to drill down into the notification workflow’s Inspect panel

Breadcrumbs ensure back navigation returns to:


Workflow Inspect → Notifications → Notification Workflow Inspect

---

# Running a Workflow From Inside Another Workflow

The workflow designer supports selecting workflows as steps.

---

## Library (Tasks + Workflows)

Replace **Tasks Library** with **Library**, containing both:

- **Tasks**
- **Workflows**

### Improved Library Browsing

- Filters:
  - Show All
  - Tasks Only
  - Workflows Only
- Typeahead search (with icons)
- Optional tags (Utility, HTTP, Data, etc.)
- Support for Favorites/Pinned items (optional future feature)

### Visual Distinction for Workflow Nodes

Workflow nodes must have:
- A **different shape** (e.g., rounded rectangle or hexagon)
- **Blue background**
- A small **workflow icon**
- A label inside such as:


In Vars: 2 • Out Vars: 3

---

## Configuring a Workflow Node

Clicking a workflow node expands a shelf with:
- **Input Variables**
- **Output Variables**

---

## Mapping Input Variables (Execution Path Aware)

When mapping input variables for a workflow named **WFx**:

### Allowed variable sources:
- Global variables
- Macros
- Utility helpers
- **Variables produced by tasks or workflows that execute BEFORE WFx**  
  (based on actual execution order)

### Not allowed:
- Variables from tasks/workflows that execute **after** WFx
- Variables from **orphan tasks** (not connected)
- Variables from **parallel branches** not feeding into WFx

> Implementation note: Use DAG reachability + topological sort  
> to determine valid upstream variable sources.

Transformers run **before** sending the value to the child workflow.

---

## Output Variables Mapping

Output mapping lets users map child workflow’s outputs back into variables  
usable by the **parent workflow**.

---

## Workflow Node Operational Settings (Same as Tasks)

Workflow nodes behave exactly like task nodes regarding:
- **Target Tags**
- **Failure Strategy**
- **Status Override**

The behavior is identical to task nodes.

---

# Execution‑Time Safeguards

At runtime:

- Required inputs must have non-empty values
- Validate that referenced variables exist
- Transformer errors must surface clearly
- Node failure should follow its **Failure Strategy**

> No strict type validation (string/number/JSON/boolean/etc).

---

# Preventing Circular Dependencies

Whenever selecting or saving a workflow:

- Detect cycles:
  - Direct: `A → A`
  - Indirect: `A → B → C → A`

If detected:
- Display an error
- **Block Save** until the dependency is fixed

---

# Schema Locking & Usage Indicator

Workflows used by other workflows display in the designer:


Used by 6 workflows

Clicking this opens a shelf that lists all dependent workflows  
(using the same UX and visuals as the existing "task usage" list).

### Schema Changes Rules

When editing input/output variables of a workflow used by others:
- Display a warning:


This change may break workflows that depend on this workflow.

- Allow user to proceed.
- After save:
  - Revalidate dependents
  - Show any workflows that now require remapping
  - Provide quick navigation to fix broken mappings

---

# Workflow Inspect Panel (Breadcrumb Navigation)

When inspecting nested workflows, breadcrumbs show navigation:


Parent Workflow → Child Workflow → Sub-Child Workflow → ...

Back button returns to the previous breadcrumb level.

### Three-Dots Menu on Workflow Nodes (in Inspect)
- Inspect Variables
- Inspect Workflow
- Edit Workflow

Inspect Variables shows:
- Input variables (with last execution values)
- Output variables (with last execution values)

Inspect Workflow opens the workflow’s inspect view.

---

# Scheduling Tab

- Placeholder for future scheduling capabilities (cron, windows, calendars, etc.)

---

# Naming & Consistency

Use consistent terminology across UI components:
- “Variables”
- “Values”
- “Notifications”
- “Library”
- “Input Variables”
- “Output Variables”
- “Use Parent Workflow Input”

---

# Visual & UX Summary

- Library contains tasks + workflows with filters and clear icons.
- Workflow nodes appear visually distinct.
- Input mappings obey upstream-only constraints.
- Circular dependency protection prevents invalid graphs.
- Schema warning preserves workflow stability without enforcing versioning.
- Notifications use event → action architecture.
- Inspect panel uses breadcrumbs for easy navigation.
- All shelf panels follow the same UX patterns.


