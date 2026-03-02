# Task: Implementation Plan - Dynamic Ops Console & Runtime Observability

This document outlines the roadmap for implementing a dynamic "Operations Console" in the Administration section, allowing for real-time control of logging levels and system tracing without requiring service restarts.

---

## 📋 Task List

### Phase 1: Persistence Foundation
- [ ] **1.1 Prisma Schema Update**: Add a `SystemSetting` model.
  - Fields: `id` (String-PK), `key` (String-Unique), `value` (JSON), `description` (String), `updatedAt` (DateTime).
- [ ] **1.2 DB Migration**: Run `npx prisma migrate dev` to create the table.
- [ ] **1.3 Initial Seed**: Populate default settings for `LOG_LEVEL` (INFO) and `DB_DEBUG` (false).

### Phase 2: Backend Logic (API)
- [ ] **2.1 Settings Module**: Create `SettingsService` and `SettingsController`.
  - Methods: `getSetting(key)`, `setSetting(key, value)`, `getAllSettings()`.
- [ ] **2.2 Real-time Logger Integration**: 
  - Update `LoggerService` to allow dynamic changes to its transport log levels.
- [ ] **2.3 Dynamic DB Logging**: 
  - Create a mechanism in `PrismaService` to toggle its internal log array based on the `DB_DEBUG` setting in real-time.

### Phase 3: Administrative UI (Web)
- [ ] **3.1 Admin View Extension**: Add an "Operation Settings" or "Obsverability" section to the Admin tab.
- [ ] **3.2 Control Dashboard**: 
  - **Global Log Level**: Dropdown selection (Error, Warn, Info, Debug, Trace).
  - **Raw DB Debug**: Switch/Toggle for SQL query visibility.
  - **Auto-Reset Safety**: (Optional) Add a "Debug for 15m" button that automatically reverts logs.
- [ ] **3.3 Feedback System**: Visual toast notifications when settings are successfully applied across the cluster.

---

## 🛠️ Architecture Notes

### Security
- Every setting change must be guarded by the `@Roles(Role.ADMIN)` decorator.
- Implement an audit trail: Log every change to the settings table with the performing user's ID.

### Performance
- The `SettingsService` should use an internal cache (e.g., a simple JS Map) and refresh from the DB every 30-60 seconds to avoid hitting the DB on every single log entry.

### Future Scope: Worker Settings
- Extend the `SettingsService` so that Workers can pull their own debug flags (e.g., `WORKER_POLLING_VERBOSE`) from the centralized API store.

---
**Status**: 📥 Planned | **Priority**: Medium | **Target Version**: v1.x
