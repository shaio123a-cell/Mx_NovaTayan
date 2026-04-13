##### DONE !!!!!!!



# Design: Workflow Folder Management

Status: **Draft** | Priority: **High** | Version: **1.0**

## 1. Overview
This feature brings hierarchical organization to Workflows, matching the functionality already present in the "Tasks" system. Users will be able to create, rename, and delete folders, navigate via breadcrumbs, and move workflows between folders.

### Core Objectives
- **Consistency**: Mirror the Task folder UX for a unified automation experience.
- **Scalability**: Enable users to manage hundreds of workflows effectively.
- **Safety**: Prevent accidental deletion of folders containing workflows used as "Child Workflows" or in active schedules.

---

## 2. Technical Design

### 2.1 Database Schema (Prisma)
We will create a `WorkflowGroup` model that mirrors `TaskGroup`.

```prisma
model WorkflowGroup {
  id          String     @id @default(uuid())
  name        String
  description String?
  
  // Recursive Hierarchy
  parentId    String?
  parent      WorkflowGroup? @relation("WorkflowGroupToWorkflowGroup", fields: [parentId], references: [id])
  children    WorkflowGroup[] @relation("WorkflowGroupToWorkflowGroup")

  workflows   Workflow[]   
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([name, parentId])
  @@map("workflow_groups")
}

// Update Workflow model
model Workflow {
  ...
  folderId   String?
  folder     WorkflowGroup? @relation(fields: [folderId], references: [id])
  ...
}
```

### 2.2 API Endpoints
- `GET /api/workflows/folders/tree`: Returns the hierarchical structure.
- `POST /api/workflows/folders`: Create a new folder.
- `PATCH /api/workflows/folders/:id`: Rename/Edit folder.
- `DELETE /api/workflows/folders/:id`: Delete folder (with blocking logic).

---

## 3. UX / UI Design

### 3.1 Sidebar-First Navigation
Following the polished Tasks system, Workflows will use the **Resizable Sidebar Tree** as the primary navigation engine.
- **Auto-Expansion**: The sidebar tree will automatically expand to show the selected folder path on page load.
- **Resizable Width**: Users can drag the sidebar edge to accommodate deep folder hierarchies (up to 500px).
- **Independent Controls**: Separated hit areas for **Toggling** (Chevron/Icon) and **Navigating** (Label), allowing users to browse without losing their current view.
- **No Tile Clutter**: The main Dashboard view will NOT show subfolder tiles, ensuring workflows are always visible at the top.

### 3.2 Safety & Error Handling
- **Deletion Blockers**: A modal will show if a folder contains workflows used in:
    1.  Active Schedules (Bindings).
    2.  As "Child Workflow" nodes in other parent workflows.

---

## 4. Implementation Tasks

### Phase 1: Infrastructure (Backend)
- [ ] **Schema Update**: Implement `WorkflowGroup` and relations in Prisma.
- [ ] **Migrations**: Generate and run the migration.
- [ ] **Folder Controller/Service**: Implement CRUD operations and hierarchical tree generation.
- [ ] **Blocking Logic**: Implement checks for workflow dependencies when deleting folders.

### Phase 2: Dashboard UI (Frontend)
- [ ] **API Client**: Update `workflowsApi` with folder methods.
- [ ] **Breadcrumbs**: Synchronize `Dashboard.tsx` with the global breadcrumb context.
- [ ] **Subfolder Grid**: Implement visual folder list at the top of the Dashboard.
- [ ] **Flow Filtering**: Update the workflow list fetch to filter by `folderId`.

### Phase 3: Modals & Management
- [ ] **Create/Rename Modals**: Re-use the styled modals from `Tasks.tsx`.
- [ ] **Delete Confirmation**: Implement the blocker modal for recursive deletions.
- [ ] **"Move to Folder"**: Add a shelf or dropdown action to change a workflow's folder.
