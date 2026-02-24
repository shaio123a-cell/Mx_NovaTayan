# Workflow Variables Architecture: Inputs and Outputs

This document explains the conceptual model of variables within the Antigravity workflow engine, using the analogy of functions and procedures in programming.

---

## 🎭 The Function Analogy

A workflow can be viewed as a **Function** or **Procedure**:
- **Input Variables** are like **function parameters** (arguments).
- **Output Variables** are like the **return value** of the function.

This mental model is especially important when dealing with **Nested Workflows**, where a parent workflow "calls" a child workflow.

---

## 📥 Input Variables (The Initial State)

Input variables are defined in the **Workflow Administration** panel. They represent the data required for the workflow to begin its work.

### 🕒 Lifecycle & Timing
- **Processing Time**: Input variables are processed and resolved during the **Initialization Phase** of the workflow execution.
- **Availability**: They are populated *before* any task (HTTP) or Variable Manipulation Activity (VMA) is executed.
- **Scope**: Once initialized, they are globally available back-to-back across the entire workflow. Any node can reference them using the `{{variable_name}}` syntax.

### 🛠️ Use Cases
- Passing a `userId` or `transactionId` to be used for multiple API calls.
- Defining configurable environment settings (e.g., `api_version`).

---

## 📤 Output Variables (The Final Result)

Output variables (also called Return Variables) are also defined in the **Workflow Administration** panel. They represent the "final product" of the workflow's execution.

### 🕒 Lifecycle & Timing
- **Processing Time**: Output variables are evaluated at the **End of Execution**, after all tasks and VMAs within the workflow have completed.
- **Evaluation**: The engine looks at the final state of all variables at the end of the run and extracts the specific ones declared as outputs.
- **Filtering**: Only variables explicitly declared as outputs are returned to the caller. This ensures **Variable Isolation**, hiding internal implementation details (temporary variables used for logic) from the parent workflow.

---

## 🔗 Nested Workflows (Parent-Child Interaction)

When one workflow initiates another, the variable flow follows a strict contract:

1.  **Passing Arguments (Parent → Child)**:
    - The parent workflow maps its own variables or static values to the child's **Input Variables**.
    - This happens in the "Details" or "Input Mapping" tab of the Workflow Node in the designer.

2.  **Receiving Results (Child → Parent)**:
    - When the child workflow finishes, it "returns" its **Output Variables**.
    - These values are then made available to the parent workflow's context.
    - **Variable Picker Integration**: In the Parent Workflow Designer, subsequent nodes can use the **Variable Picker** in the "Output Mapping" tab to select variables returned by the child workflow (displayed with distinct purple styling and icons).

---

## 🚀 Summary Table

| Feature | Input Variables | Output Variables |
| :--- | :--- | :--- |
| **Analogy** | Function Parameters | Return Value |
| **Defined In** | Workflow Admin | Workflow Admin |
| **Resolved At** | Start of Execution (Init) | End of Execution (Finalize) |
| **Primary Goal** | Provide context for tasks | Expose results to callers |
| **Visibility** | All nodes in the workflow | The parent/caller workflow |
| **Isolation** | High (External setup) | High (Internal implementation hidden) |
