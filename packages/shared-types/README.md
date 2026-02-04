# @restmon/shared-types

Shared TypeScript types and interfaces for the RestMon platform.

## Purpose

This package contains all shared domain models used across:
- Frontend (`apps/web`)
- Backend API (`apps/api`)
- Worker Engine (`apps/worker`)

## Key Types

- **User & Security**: `User`, `UserRole`, `Secret`, `ScopeType`
- **Task**: `Task`, `HttpRequestConfig`, `VariableExtraction`, `OutputMutation`
- **Workflow**: `Workflow`, `WorkflowNode`, `WorkflowEdge`
- **Execution**: `WorkflowExecution`, `TaskExecutionResult`, `ExecutionStatus`
- **Schedule**: `Schedule`, `RecurrenceType`
- **Signals**: `Signal`, `SignalState`, `SignalSourceType`

## Usage

```typescript
import { Workflow, Task, ExecutionStatus } from '@restmon/shared-types';
```

## Build

```bash
npm run build
```

This generates TypeScript declaration files in `./dist`.
