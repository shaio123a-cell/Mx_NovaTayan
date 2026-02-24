# Workflow Inspector & Designer Fixes (Round 2)

This document details the fixes implemented to resolve critical bugs in the Workflow Inspector and Designer regarding variable handling and task type detection.

## 1. Inspector: "HTTP Task" Misidentification for Variable Tasks
**Issue:** `VARIABLE` tasks were being identified as `HTTP` tasks in the inspector, causing the "Response Raw Data" section to appear (and error out with "name is not defined") instead of the "Logic Node Context" section.
**Root Cause:** The `onNodeClick` handler's detection logic was flawed. It relied on `record.task` being present, but for utility tasks, `record.task` is often null. The fallback logic defaulted to `HTTP`.
**Fix:** Updated `WorkflowExecutionDetail.tsx` to check `record.input?.utility === true` and `record.input?.nested === true`, which are reliably set by the backend during execution creation.
```typescript
const isUtil = record.input?.taskType === 'VARIABLE' || 
              record.input?.utility === true || 
              ...
```

## 2. Inspector: "Manipulation Results" Section Errors
**Issue:** The "Manipulation Results" section was always rendered, even for HTTP tasks with no variables. This caused confusion and errors when accessing undefined properties.
**Root Cause:** Missing conditional wrapper around the section.
**Fix:** Wrapped the entire section in `WorkflowExecutionDetail.tsx` with a check:
```typescript
{(selectedTask.taskType === 'VARIABLE' || selectedTask.taskType === 'WORKFLOW' || Object.keys(selectedTask.result?.variables || {}).filter(k => !k.startsWith('__')).length > 0) && (
    <section> ... </section>
)}
```

## 3. Designer: Missing Child Workflow Output Variables in Picker
**Issue:** When editing a node in the Designer (WF1) that calls a sub-workflow (WF2), the Variable Picker did not show the declared output variables of WF2.
**Root Cause:** The `upstreamVarNames` logic in `WorkflowDesigner.tsx` relied strictly on `n.data.taskType === 'WORKFLOW'`. If the node's `taskType` property was missing or incorrect (e.g. from legacy nodes or failed migration), it defaulted to `HTTP` logic, preventing it from looking up the child workflow's definition.
**Fix:** Improved the detection logic to also check if the node's `taskId` corresponds to a known workflow ID:
```typescript
const isNodeWorkflow = n.data.taskType === 'WORKFLOW' || !!allWorkflows?.find((w: any) => w.id === n.data.taskId);
```
This ensures that any node pointing to a workflow is treated as a workflow node for variable resolution.

## 4. Inspector: Child Workflow Output Filtering
**Issue:** Inspecting a child workflow node showed ALL internal variables instead of just declared outputs.
**Root Cause:** The filtering logic was skipped because the task was misidentified as `HTTP` (see Issue 1).
**Fix:** With the fix for Issue 1 (correct `taskType` detection), the existing logic to filter outputs based on `outputVariables` will now correctly trigger.

## Verification Steps
1. **Inspector:** Click on a `VARIABLE` task. Verify it says "VARIABLE Engine Task" and shows "Logic Node Context". Verify NO "Response Raw Data".
2. **Inspector:** Click on a `WORKFLOW` task. Verify "Manipulation Results" shows only declared outputs (or nothing if none declared), and not internal variables.
3. **Designer:** Open WF1. Click on a node representing WF2. Open Variable Picker for a downstream task. Verify WF2's output variables are listed under the workflow name.
