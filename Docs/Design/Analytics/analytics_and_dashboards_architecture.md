# Design: Analytics & Dashboards Architecture

Status: **Proposed** | Priority: **High** | Version: **1.0**

---

## 1. Overview

As Restmon accumulates execution history over weeks and months, two critical needs emerge:

1. **Operational Dashboards**: Trend charts, success/failure rates, SLA compliance, volume heatmaps — typically viewed by Team Leads and Ops personnel.
2. **Historical Debugging**: The ability to drill into a specific execution from any time period (yesterday, 6 months ago) and view its full Inspector-level verbose data.

This document defines the architecture to serve both needs without degrading the performance of the primary Restmon application.

---

## 2. Core Principles

- **PostgreSQL stays as the operational hot store** — no changes to how tasks, workflows, or real-time execution records are written.
- **ClickHouse is the single source of truth for analytics** — Grafana queries ClickHouse only, with no split-datasource problem.
- **Dual-write, not delayed migration** — every execution is simultaneously written to both Postgres (full verbose, pruned after N days) and ClickHouse (full verbose + pre-computed metrics, kept forever).
- **Near-real-time** — data is flushed to ClickHouse within 30 seconds of execution completion. Dashboards are never more than ~30 seconds stale.
- **Drill-down is always possible** — clicking any chart element in Grafana opens the Restmon Inspector directly, regardless of whether the data is 1 day or 2 years old.

---

## 3. Architecture Diagram

```
  EXECUTION RUNTIME
  ─────────────────
  NestJS Worker (execution completion event)
       │
       ├──────────────────────────────────────────────────────────┐
       ▼                                                          ▼
  PostgreSQL                                               ClickHouse
  ─────────────────────────────────────────────────        ─────────────────────────────────────────
  Full verbose execution record                           Full verbose execution record (compressed)
  (request payload, response body, logs, timings)        + Pre-indexed metric fields (status, duration, etc.)
  ─────────────────────────────────────────────────        ─────────────────────────────────────────
  HOT DATA: Last 30 days (configurable)                  WARM/COLD DATA: Forever (columnar compression)
  Powers: Inspector, real-time CRUD                      Powers: Grafana dashboards

       │                                                          │
       ▼                                                          ▼
  Auto-pruned after retention window                       Grafana
  (Data Link: click → Restmon Inspector)        (embedded in Restmon UI via iframe kiosk mode)
                                                                  │
                                                                  │ Data Link on chart click
                                                                  ▼
                                              GET /api/executions/:id (Restmon API)
                                              ┌──────────────────────────────────────┐
                                              │ if found in Postgres → return full    │
                                              │ else → pull from ClickHouse archive  │
                                              └──────────────────────────────────────┘
```

---

## 4. Data Layer Specifications

### 4.1 PostgreSQL (Hot Store — existing)

No schema changes are required. PostgreSQL continues to be the primary OLTP database.

**Retention Policy:**
- Execution logs and node-level records are automatically pruned after a configurable retention window (default: **30 days**).
- The pruning is run by a NestJS CRON job (e.g., nightly at 03:00).
- The retention window is configurable in **Admin Settings** per environment.

**What stays in Postgres forever:**
- Workflow definitions
- Task definitions
- Global variables
- User / auth data

**What gets pruned:**
- `WorkflowExecution` records
- `NodeExecution` records
- Raw log payloads

---

### 4.2 ClickHouse (Analytics Store — new)

ClickHouse is an open-source columnar OLAP database. It is extremely fast for time-series aggregation, uses very little RAM (256–512MB at idle), and has first-class Grafana integration.

**Container (Podman / Docker Compose):**

```yaml
clickhouse:
  image: clickhouse/clickhouse-server:latest
  ports:
    - "8123:8123"   # HTTP interface (Grafana)
    - "9000:9000"   # Native TCP interface (NestJS client)
  environment:
    CLICKHOUSE_DB: restmon_analytics
    CLICKHOUSE_USER: restmon
    CLICKHOUSE_PASSWORD: restmon_pass
  volumes:
    - clickhouse_data:/var/lib/clickhouse
  ulimits:
    nofile:
      soft: 262144
      hard: 262144
```

**Core ClickHouse Tables:**

```sql
-- Workflow-level execution summary (one row per workflow execution)
CREATE TABLE workflow_executions (
    execution_id        String,
    workflow_id         String,
    workflow_name       String,
    started_at          DateTime,
    ended_at            DateTime,
    duration_ms         UInt32,
    status              LowCardinality(String),  -- SUCCEEDED | FAILED | TIMEOUT
    triggered_by        LowCardinality(String),  -- SCHEDULE | MANUAL | EVENT
    node_count          UInt16,
    failed_node_count   UInt16,
    environment         LowCardinality(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(started_at)
ORDER BY (workflow_id, started_at);

-- Node-level execution detail (one row per node per execution)
CREATE TABLE node_executions (
    execution_id        String,
    node_id             String,
    task_id             String,
    task_name           String,
    workflow_id         String,
    started_at          DateTime,
    ended_at            DateTime,
    duration_ms         UInt32,
    status              LowCardinality(String),
    http_status_code    Nullable(UInt16),
    error_message       Nullable(String),
    -- Compressed verbose payload for drill-down recovery
    request_payload     String CODEC(ZSTD(3)),
    response_body       String CODEC(ZSTD(3)),
    response_headers    String CODEC(ZSTD(3))
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(started_at)
ORDER BY (workflow_id, execution_id, started_at);
```

---

## 5. Dual-Write Strategy

Every execution completion event in `worker.service.ts` triggers a write to both systems.

### 5.1 Write Path

```
worker.service.ts
    │
    └── ExecutionCompletedEvent
            │
            ├──► PostgresqlExecutionRepository.save()  (existing, unchanged)
            │
            └──► ClickHouseAnalyticsService.flush()    (new, async, non-blocking)
```

**Key constraint:** The ClickHouse write is **fire-and-forget async** — it never blocks the worker's main execution path. If ClickHouse is down or slow, the workflow execution still completes and saves to Postgres normally.

### 5.2 Buffered Micro-Batch Flushing

To avoid overwhelming ClickHouse with one HTTP request per node execution, the `ClickHouseAnalyticsService` buffers records in memory and flushes:
- Every **30 seconds** (timer-based), OR
- When the in-memory buffer reaches **100 records** (size-based)

whichever comes first.

```typescript
// apps/api/src/analytics/clickhouse-analytics.service.ts (pseudocode)
@Injectable()
export class ClickHouseAnalyticsService {
    private buffer: NodeExecutionRecord[] = [];
    
    async record(data: NodeExecutionRecord) {
        this.buffer.push(data);
        if (this.buffer.length >= 100) await this.flush();
    }

    @Interval(30_000)
    async flush() {
        if (this.buffer.length === 0) return;
        const batch = this.buffer.splice(0);
        await this.clickhouseClient.insert({ table: 'node_executions', values: batch });
    }
}
```

---

## 6. Dashboard Layer (Grafana)

### 6.1 Container

```yaml
grafana:
  image: grafana/grafana:latest
  ports:
    - "3001:3000"
  environment:
    GF_AUTH_ANONYMOUS_ENABLED: "true"
    GF_AUTH_ANONYMOUS_ORG_ROLE: Viewer
    GF_SECURITY_ALLOW_EMBEDDING: "true"
    GF_SERVER_ROOT_URL: "http://localhost:3001"
  volumes:
    - grafana_data:/var/lib/grafana
    - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    - ./grafana/datasources:/etc/grafana/provisioning/datasources
```

### 6.2 Datasource Configuration

Grafana is pre-provisioned (via YAML) to connect to ClickHouse using the official ClickHouse Grafana plugin. No manual configuration required after startup.

### 6.3 Planned Dashboards

| Dashboard | Primary Metrics |
|---|---|
| **Workflow Health Overview** | Success rate %, failure rate %, executions per hour, p95 duration |
| **Workflow Drill-Down** | Per-workflow trend, failure breakdown by node, SLA heatmap |
| **Task Performance** | Top N slowest tasks, error rate per task, HTTP status code distribution |
| **Volume & Throughput** | Executions per day over time, peak hours heatmap |
| **Error Analysis** | Most common error messages, failure patterns by time of day |

### 6.4 Restmon UI Integration (Embedded iFrames)

A new `Dashboards` page will be added to Restmon's main navigation.

```tsx
// apps/web/src/pages/Dashboards.tsx
// Embeds Grafana panels in kiosk mode (no sidebar, no header)

<iframe
  src="http://localhost:3001/d/workflow-health?kiosk=tv&theme=light"
  style={{ width: '100%', height: '100%', border: 'none' }}
/>
```

The Grafana sidebar, menu, and header are completely hidden via `kiosk=tv` mode. To the end-user it looks like a native Restmon dashboard.

---

## 7. Drill-Down: Dashboard → Inspector

### 7.1 Grafana Data Links

Every chart panel in Grafana is configured with a **Data Link** pointing back to Restmon:

```
# Configured in Grafana panel JSON
Data Link URL:
  http://localhost:5173/inspector?executionId=${__data.fields.execution_id}
```

Clicking any bar, dot, or table row in a Grafana chart opens Restmon's Inspector in a new tab, pre-loaded with that specific execution.

### 7.2 Inspector API Routing

The Restmon API intelligently routes the Inspector fetch request to the correct datastore:

```typescript
// apps/api/src/executions/executions.service.ts
async getExecutionById(id: string): Promise<ExecutionDetail> {
    // 1. Try PostgreSQL first (fast, full verbose)
    const pgRecord = await this.prisma.workflowExecution.findUnique({ where: { id } });
    if (pgRecord) return this.formatForInspector(pgRecord, 'postgres');

    // 2. If not in Postgres (pruned), fall back to ClickHouse archive
    const chRecord = await this.clickhouseService.getExecutionById(id);
    if (chRecord) return this.formatForInspector(chRecord, 'clickhouse');

    throw new NotFoundException(`Execution ${id} not found in any store`);
}
```

The Inspector UI receives the same formatted response regardless of source. An optional banner may indicate "Retrieved from archive (> 30 days old)."

---

## 8. Admin Controls

The following settings are added to **Admin Settings → Analytics**:

| Setting | Default | Description |
|---|---|---|
| `POSTGRES_RETENTION_DAYS` | `30` | Days before verbose execution records are pruned from Postgres |
| `CLICKHOUSE_ENABLED` | `true` | Toggle dual-write on/off |
| `ANALYTICS_FLUSH_INTERVAL_MS` | `30000` | How often the ClickHouse buffer is forcibly flushed |
| `ANALYTICS_BUFFER_SIZE` | `100` | Max buffer size before an immediate flush is triggered |
| `GRAFANA_BASE_URL` | `http://localhost:3001` | Used by the embedded Dashboard page |

---

## 9. Phased Implementation Plan

### Phase 1: Infrastructure (Container Stack)
- Add ClickHouse and Grafana to `docker-compose.yml` / `podman-compose.yml`
- Apply ClickHouse DDL schema migrations
- Configure Grafana datasource auto-provisioning (YAML)

### Phase 2: Dual-Write Service
- Create `ClickHouseAnalyticsModule` in `apps/api/src/analytics/`
- Integrate micro-batch buffer + 30s flush interval
- Hook into `WorkerService` execution completed events

### Phase 3: Grafana Dashboards
- Build and provision the 5 core dashboards
- Configure Data Links on all panels pointing back to Restmon Inspector

### Phase 4: Restmon UI Integration
- Create `Dashboards.tsx` page with embedded iframe panels
- Add "Dashboards" to the main navigation
- Add Analytics section to Admin Settings

### Phase 5: Inspector Routing
- Add ClickHouse fallback to `ExecutionsService.getById()`
- Add "Archived Record" indicator banner to Inspector UI
- Add Postgres CRON pruning job with retention policy

---

## 10. Why This Approach Works

1. **No split-datasource problem**: Grafana only talks to ClickHouse. The full timeline (today through years ago) is always available in one place.
2. **Near-real-time**: 30-second flush latency — far better than a nightly cron.
3. **Postgres stays fast forever**: Hot data is pruned on schedule. The Inspector remains snappy for recent executions.
4. **Drill-down always works**: Whether you click a 1-day-old or 2-year-old execution in Grafana, the Restmon Inspector intelligently routes to the right store.
5. **Operationally simple**: ClickHouse is a single binary, no JVM, ~300MB RAM idle. It adds minimal operational complexity to the dev stack.
6. **Non-blocking**: ClickHouse write failures never affect the primary execution pipeline.
