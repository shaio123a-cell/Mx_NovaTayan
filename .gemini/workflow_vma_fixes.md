# Critical Fixes: Variable Manipulation Activity (VMA)

**Date:** 2026-02-19
**Focus:** Resolving VMA execution failures and misidentification.

## 🐛 Root Cause Analysis

1.  **VMA Identification Failure:**
    -   The backend (`workflows.service.ts`) failed to identify VMA tasks because it relied solely on `taskType === 'VARIABLE'`.
    -   Many VMA nodes (potentially legacy or specific creation paths) lacked this property, causing `isUtility` to be `false`.
    -   **Result:** The system treated VMA as a standard HTTP task.

2.  **Execution Failure (HTTP Fallback):**
    -   Because it was treated as `HTTP`, the Worker received an instruction to execute an HTTP request.
    -   VMA nodes lack `url`/`method`, defaulting to empty strings.
    -   **Result:** The Worker attempted an invalid HTTP request, which failed immediately.

3.  **Frontend Misrepresentation:**
    -   The Inspector (`WorkflowExecutionDetail.tsx`) also relied on `isUtility` being true (from input or task type).
    -   Since the backend sent `utility: false` (and defaulted `taskType` to 'HTTP' in input), the Frontend rendered the "Response Raw Data" section.
    -   **Result:** Users saw "HTTP Task" errors ("name is not defined") instead of the VMA context.

## 🛠️ Fixes Applied

### 1. Backend: Robust VMA Detection
**File:** `apps/api/src/workflows/workflows.service.ts`
-   Updated `isUtility` check to include the specific `taskId` used by VMA nodes (`00000000-0000-0000-0000-000000000001`).
-   This ensures VMA is correctly identified even if `taskType` is missing.
-   **Effect:** `input.utility` is set to `true` in the execution record. `taskId` is set to `null` (decoupled from HTTP task definitions).

### 2. Frontend: Legacy Support & Display Fix
**File:** `apps/web/src/pages/WorkflowExecutionDetail.tsx`
-   Added check for `record.taskId === '00000000-0000-0000-0000-000000000001'` in the `isUtility` logic.
-   **Effect:** Even *existing* failed executions will now correctly display as "VARIABLE Engine Task" (instead of broken HTTP task), allowing you to inspect their variables.

### 3. Worker: Verified Execution Logic
-   Verified `apps/worker/src/index.ts`.
-   The worker correctly skips HTTP requests if `isUtility` is true.
-   **Effect:** With the backend fix, the worker will now skip the invalid HTTP request and proceed directly to variable manipulation (which is what VMA is).

## ✅ Verification

1.  **Restart Services:** You MUST restart your API, Worker, and Frontend (if running locally) to pick up the build.
2.  **Inspect Old Failures:** Go to a failed VMA execution. It should now show "VARIABLE Engine Task" and the "Logic Node Context" section.
3.  **Run New Workflow:** specific VMA tasks should now generally SUCCEED (green status) because they no longer attempt invalid HTTP requests.

---

## 🔄 Round 3 Updates (2026-02-19)

**Issue:** User reported persistent failures even with Round 2 fixes.
**Investigation:** Worker logs showed `ID: synthetic`, implying `taskId` was NULL but execution still failed as HTTP task. This meant `isUtility` detection was partially working (setting taskId null) or failing in a way that left `utility: false` in input. Also suspected missing `taskType` property in backend loop.

**Fixes:**
1.  **Enhanced Backend Detection:** Added check for `taskId === 'util-vars'` (the ID assigned by Frontend Drag & Drop) in `workflows.service.ts`.
2.  **Enhanced Frontend Display:** Added check for `taskId === 'util-vars'` in `WorkflowExecutionDetail.tsx`.
3.  **Debug Logging:** Added verbose `[DEBUG]` logs in both Backend (`Evaluating node...`) and Worker (`Worker execution input...`) to trace exactly why detection fails if it persists.

**Verification:**
-   Restart services.
-   Run VMA task.
-   Check Worker console for `[DEBUG]` lines.
-   If successful, `isUtility` should be `true` in logs.
