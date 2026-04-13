# Design: Export & Import System

Status: **Draft** | Priority: **High** | Version: **1.1**
y
## 1. Overview
This feature enables users to export one or more Tasks or Workflows into a portable format (`.restmon.json`) and import them into other environments. With the introduction of **Hierarchical Folder Management**, the system now supports exporting entire folder trees while preserving the structural context of the automations.

### Core Objectives
- **Portability**: Move automations between Dev, Sandbox, and Prod environments.
- **Structural Integrity**: Export folder hierarchies along with their contents.
- **Recursive Resolution**: Automatically include all Tasks required by an exported Workflow.
- **Safety**: Ensure sensitive data (secrets) are never leaked during export.

---

## 2. Technical Specification

### 2.1 The "RestMon Bundle" Format
The bundle is a JSON object containing a flattened list of entities. Relationships (like folder parents) are preserved via unique local IDs within the bundle.

```json
{
  "$schema": "https://restmon.io/schemas/export-v1.json",
  "metadata": {
    "version": "1.1",
    "exportedAt": "2024-04-13T12:00:00Z",
    "source": "RestMon-Internal",
    "type": "HIERARCHICAL_BUNDLE"
  },
  "data": {
    "folders": [
      {
        "localId": "f-1",
        "name": "Production API",
        "type": "TASK",
        "parentId": null
      },
      {
        "localId": "f-2",
        "name": "Authentication",
        "type": "TASK",
        "parentId": "f-1"
      }
    ],
    "tasks": [
      {
        "localId": "t-1",
        "folderId": "f-2",
        "name": "Login v1",
        "command": { "url": "{{BASE_URL}}/login", "method": "POST" }
      }
    ],
    "workflows": []
  }
}
```

### 2.2 Security & Sanitization
> [!IMPORTANT]
> Exports are sanitized at the engine level before being sent to the client.

1.  **Primary Keys**: All database IDs (UUIDs) are stripped.
2.  **Secrets**: `secretId` fields are replaced with `secretName`. The actual secret value is **NEVER** included.
3.  **Global Variables**: Preserved as references (e.g., `{{URL}}`).

---

## 3. Functional Design

### 3.1 Recursive Collection Logic
When an item is selected for export, the system performs a recursive scan:

1.  **Individual Task**: Add task to bundle.
2.  **Workflow**: Add workflow + scan all nodes -> Add every referenced Task or Child Workflow to bundle.
3.  **Folder**: Add folder record -> Recursively add all sub-folders -> Add all Tasks/Workflows contained within those folders.

### 3.2 Import & Conflict Resolution

| Scenario | System Action | User Option |
| :--- | :--- | :--- |
| **New Folder Path** | Recreate the hierarchy from root | `Always Recreate` / `Map to Root` |
| **Folder Collision** | Existing folder at same path/level | `Merge Content` / `Create Copy` |
| **Task Collision** | Name matches in same folder | `Overwrite` / `New Version` / `Skip` |
| **Missing Secret** | Task references unknown secret name | `Map to Existing` / `Create Placeholder` |

---

## 4. UX / UI Design

### 4.1 Hierarchical Selection
- **Sidebar Integration**: Folders in the sidebar gain an "Export" action in their context menu.
- **Bulk Selection**: When multiple items are selected via checkboxes, the "Export Bundle" action appears in the footer.
- **Dependency Drawer**: Before download, a summary shows how many *implicit* tasks are being added to the bundle because they are used by selected workflows.

### 4.2 The Import Wizard
1.  **Staging**: Upload JSON. Items are parsed and shown in a tree view.
2.  **Validation**: System highlights conflicts and missing dependencies.
3.  **Mapping**: User chooses how to resolve conflicts and map secrets.
4.  **Execution**: Entities are created in the correct order (Folders -> Tasks -> Workflows).

---

## 5. Implementation Tasks

### Phase 1: Recursive Engine (Backend)
- [ ] **Dependency Collector**: Service to build a flat list of IDs for a given selection (including nested child workflows).
- [ ] **Folder Structure Flattener**: Utility to convert a tree selection into a list of folder records with bundle-local IDs.
- [ ] **Sanitization Pipeline**: Standard transformer that removes sensitive and environment-specific keys.

### Phase 2: Selection Enhancements (Frontend)
- [ ] **Sidebar Actions**: Add "Export" icon/menu item to recursive folder items.
- [ ] **Multi-select State**: Implement global selection store to track items across different folders.
- [ ] **Bundle Preview**: Simple dialog showing "You are about to export 3 Workflows and 12 dependent Tasks".

### Phase 3: Import Intelligence
- [ ] **Pre-flight API**: Endpoint that returns a list of "Intentions" (Create/Update/Warn) for a given JSON.
- [ ] **Structural Importer**: Logic to create folders top-down before attaching tasks/workflows.

### Phase 4: Polish
- [ ] **Progress Indicators**: Support for larger bundles (100+ items).
- [ ] **Auto-Versioning**: Optional logic to create a copy with (v2) suffix if collision occurs.
- [ ] **Sanity Checker**: Identify and warn on broken Task references within imported Workflows.
