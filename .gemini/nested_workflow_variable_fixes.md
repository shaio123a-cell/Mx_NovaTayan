# Nested Workflow Variable Handling - Critical Fixes

**Date:** 2026-02-17  
**Session:** Variable Isolation & Output Mapping Fixes

---

## 🐛 Issues Fixed

### 1. ✅ Variable Manipulation Tasks Showing as "HTTP Task"

**Problem:** VARIABLE type tasks were displaying HTTP-specific sections in the inspector (Network Request, Response Raw Data).

**Root Cause:** The inspector was only checking for `taskType === 'HTTP'` but not excluding VARIABLE tasks from HTTP-specific rendering.

**Fix Applied:**
- Added dedicated section for VARIABLE tasks with "Logic Node Context" header
- Shows informational message explaining it's a pure computation node
- HTTP sections now only render when `selectedTask.taskType === 'HTTP'`

**File:** `apps/web/src/pages/WorkflowExecutionDetail.tsx`

---

### 2. ✅ "name is not defined" Error in Variable Task Inspector

**Problem:** When inspecting VARIABLE tasks, the "Response Raw Data" section was trying to access undefined properties.

**Root Cause:** VARIABLE tasks don't have HTTP response data, but the HTTP section was still rendering.

**Fix Applied:**
- Conditional rendering ensures HTTP sections only show for HTTP tasks
- VARIABLE tasks now show their own dedicated context section
- No more attempts to access `selectedTask.result.data` for VARIABLE tasks

**File:** `apps/web/src/pages/WorkflowExecutionDetail.tsx`

---

### 3. ✅ Child Workflow Showing ALL Internal Variables

**Problem:** When inspecting a child workflow (WF2) executed by a parent (WF1), the inspector showed ALL internal variables from WF2, not just the declared output variables.

**Root Cause:** The manipulation results section wasn't filtering based on the workflow's `outputVariables` declaration.

**Fix Applied:**
- Enhanced the manipulation results table to check if `selectedTask.taskType === 'WORKFLOW'`
- If it's a workflow task, only variables declared in `nodeDef.outputVariables` or `selectedTask.task.outputVariables` are displayed
- Internal implementation variables are now properly hidden from parent context

**Code Logic:**
```typescript
// For WORKFLOW tasks, only show declared output variables
let varsToShow = Object.entries(allVars).filter(([k]) => !k.startsWith('__'));
if (selectedTask.taskType === 'WORKFLOW') {
    const declaredOutputs = nodeDef?.outputVariables || selectedTask.task?.outputVariables || {};
    const declaredKeys = Object.keys(declaredOutputs);
    varsToShow = varsToShow.filter(([k]) => declaredKeys.includes(k));
}
```

**File:** `apps/web/src/pages/WorkflowExecutionDetail.tsx` (lines 521-531)

---

### 4. ✅ Variable Picker Not Showing WF2 Output Variables in WF1 Designer

**Problem:** When editing a node in WF1 that comes after WF2, the variable picker didn't show WF2's output variables for mapping.

**Root Cause:** The `availableUpstreamVars` calculation wasn't properly extracting and exposing workflow output variables.

**Fix Applied:**
- Enhanced `availableUpstreamVars` logic to detect WORKFLOW type nodes
- For WORKFLOW nodes, extracts variables from `n.outputVariables` or `record.task.outputVariables`
- Only declared output variables are added to the picker
- These variables are tagged with `source: 'workflow'` for proper visual styling (purple theme)

**Code Logic:**
```typescript
// For WORKFLOW nodes, only expose variables declared in outputVariables
if (n.taskType === 'WORKFLOW') {
    const declaredOutputs = n.outputVariables || record.task?.outputVariables || {};
    
    return Object.keys(declaredOutputs)
        .filter(k => !k.startsWith('__'))
        .map(name => ({
            name,
            taskName: n.label || record?.task?.name || 'Workflow',
            value: record?.result?.variables?.[name] ?? null,
            source: 'workflow' as const
        }));
}
```

**File:** `apps/web/src/pages/WorkflowExecutionDetail.tsx` (lines 248-261)

---

## 🎯 How It Works Now

### Pre-Execution (Input Mapping)
When WF2 is about to execute inside WF1:
1. Input variables are resolved from WF1's context
2. Values are passed into WF2's starting state
3. WF2 executes with these inputs

### Post-Execution (Output Mapping)
After WF2 completes:
1. WF2's execution result contains ALL internal variables
2. **Only variables declared in WF2's `outputVariables`** are exposed to WF1
3. These output variables appear in:
   - The variable picker when editing subsequent nodes in WF1
   - The manipulation results table (filtered view)
   - The upstream variables list for mapping

### Variable Isolation
- **Internal WF2 variables** (not in outputVariables): Hidden from WF1, used only within WF2
- **Declared output variables**: Visible to WF1, available for mapping and inspection
- **System variables** (prefixed with `__`): Always hidden from UI

---

## 📋 Testing Checklist

1. **Variable Task Inspector**:
   - ✓ Create a VARIABLE node
   - ✓ Run workflow and inspect the VARIABLE task
   - ✓ Verify "Logic Node Context" section appears (not HTTP sections)
   - ✓ Verify no "name is not defined" errors

2. **Workflow Output Filtering**:
   - ✓ Create WF2 with 5 internal variables
   - ✓ Declare only 2 variables in WF2's "Return Payload" (Workflow Admin)
   - ✓ Execute WF2 inside WF1
   - ✓ Inspect WF2 node in WF1's execution
   - ✓ Verify manipulation results shows ONLY the 2 declared outputs

3. **Variable Picker Population**:
   - ✓ In WF1 designer, add a task AFTER the WF2 node
   - ✓ Open Output Variables tab
   - ✓ Click variable picker
   - ✓ Verify WF2's declared output variables appear in purple
   - ✓ Verify they're labeled with WF2's name

4. **Pre/Post Execution Flow**:
   - ✓ Map input variables to WF2 (pre-execution)
   - ✓ Run WF1
   - ✓ Verify WF2 receives the inputs correctly
   - ✓ Map WF2's outputs to subsequent tasks (post-execution)
   - ✓ Verify output values are correctly propagated

---

## 🔧 Technical Implementation Details

### Data Flow
```
WF1 Execution Context
  ├─ Task A (HTTP) → produces vars: {token, userId}
  ├─ WF2 (Workflow Node)
  │   ├─ Input Mapping: {{token}}, {{userId}}
  │   ├─ Internal Execution:
  │   │   ├─ Internal vars: {temp1, temp2, temp3}
  │   │   └─ Declared outputs: {result, status}
  │   └─ Output Mapping: Only {result, status} visible to WF1
  └─ Task B (HTTP) → can use {{result}}, {{status}} from WF2
```

### Variable Scoping Rules
1. **Task Variables** (`source: 'task'`): Blue theme, from HTTP/VARIABLE tasks
2. **Workflow Variables** (`source: 'workflow'`): Purple theme, from nested workflows
3. **Global Variables**: Green theme, from global variable store
4. **System Macros**: Purple theme, from system ({{now}}, {{uuid}}, etc.)

---

## 📁 Files Modified

**Frontend:**
- `apps/web/src/pages/WorkflowExecutionDetail.tsx`:
  - Added VARIABLE task inspector section
  - Enhanced availableUpstreamVars to filter workflow outputs
  - Added manipulation results filtering for WORKFLOW tasks
  - Improved variable source tagging

**No Backend Changes Required** - The backend already stores all variables in the result. The filtering happens on the frontend based on the `outputVariables` declaration.

---

## ✅ Build Status

All workspaces compile successfully:
- ✅ `@restmon/api`
- ✅ `@restmon/web`  
- ✅ `@restmon/worker`
- ✅ `@restmon/shared-types`

---

## 🚀 Next Steps (Optional)

1. **Workflow Admin UI**: Add visual indicator showing which variables are exposed as outputs
2. **Variable Lineage**: Show full trace of where a variable originated (WF2 → WF1 → Task B)
3. **Output Variable Validation**: Warn if a declared output variable doesn't exist in WF2's execution
4. **Type Safety**: Add TypeScript interfaces for workflow output variable contracts
