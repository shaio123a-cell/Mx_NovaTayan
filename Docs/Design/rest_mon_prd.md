## 2. Business Need & Use Cases

### 2.1 Business Problems

Modern enterprises increasingly rely on RESTful APIs to deliver critical business services. While most organizations monitor API availability at the endpoint level, this approach fails to reflect real business health. APIs can be technically available (HTTP 200) while the business transaction itself is broken.

Key business problems addressed by RestMon:

1. **Endpoint monitoring does not equal business availability**  
   Existing tools validate individual endpoints but fail to validate multi-step business flows such as login → submit data → retrieve result. Failures often occur only when multiple APIs interact.

2. **Lack of transaction-level visibility**  
   When a business transaction fails, operators lack visibility into where the failure occurred, what data was sent, what was returned, and how the failure propagated across systems.

3. **Complex authentication and state handling**  
   Modern APIs rely on JWTs, tokens, session headers, and chained authentication mechanisms. These flows are difficult to monitor using simple probes or static checks.

4. **Poor operator troubleshooting experience**  
   Operators are often presented with logs or alerts without context. They must manually reconstruct execution paths, inputs, outputs, and dependencies under time pressure.

5. **Overly heavy or misaligned tooling**  
   Enterprise schedulers and automation platforms are expensive, complex, and not designed for REST-centric monitoring use cases. Conversely, lightweight tools lack durability, execution history, and governance.

---

### 2.2 Primary Use Cases

RestMon addresses the above problems by focusing on monitoring-led API orchestration.

#### 2.2.1 Business Transaction Monitoring

Organizations can define complete business transactions as workflows composed of multiple REST calls. Each workflow validates that the entire transaction behaves as expected, not just individual APIs.

Example:
- Authenticate user and retrieve JWT
- Submit business data using the token
- Retrieve and validate persisted data

Success is defined by the transaction outcome, not by individual HTTP responses alone.

---

#### 2.2.2 Synthetic Monitoring of APIs

RestMon enables synthetic monitoring by executing predefined workflows on a schedule. These workflows simulate real user or system behavior, allowing early detection of failures before customers are impacted.

Unlike traditional synthetic monitoring, RestMon preserves full execution context, enabling deep post-failure analysis.

---

#### 2.2.3 Cross-System Data Validation

RestMon can validate data consistency across systems by extracting and comparing values from multiple API responses within a single workflow execution.

Example:
- Push data into System A
- Retrieve data from System B
- Validate structure, content, or transformed output

---

#### 2.2.4 Pre-Production and Regression Validation

Teams can use RestMon to validate API workflows in test or staging environments after releases. Workflows can be executed manually or scheduled to ensure regressions are detected early.

---

#### 2.2.5 Operational Troubleshooting and RCA

When failures occur, operators can inspect:
- Exact inputs and outputs per task
- Extracted variables
- Execution timelines
- Failure points and error messages

This enables faster root-cause analysis without requiring deep system knowledge or access to multiple tools.

---

### 2.3 What This Product Is NOT

To avoid ambiguity and scope creep, RestMon explicitly does **not** aim to replace the following categories of tools:

- **Enterprise job schedulers** (e.g., Control-M)  
  RestMon is not a batch scheduling or workload automation platform. Scheduling exists only to support monitoring execution.

- **Robotic Process Automation (RPA)**  
  RestMon does not automate UI interactions or human workflows.

- **CI/CD pipelines**  
  RestMon is not a build, deployment, or release orchestration tool.

- **Enterprise Service Bus (ESB) or Integration Platforms**  
  RestMon does not serve as a real-time integration backbone or message router.

- **Pure automation platforms**  
  While workflows can trigger actions, the primary goal is observability and monitoring, not business automation.

---

### 2.4 Value Summary

RestMon fills a critical gap between API monitoring and workload orchestration by providing:

- End-to-end transaction visibility
- Operator-first troubleshooting
- Durable, replayable execution history
- Visual design and monitoring experience

The platform enables organizations to monitor what truly matters: **whether their business workflows are actually working**.


## 3. Personas & User Journeys

### 3.1 Personas

RestMon is designed for multiple personas with clearly separated responsibilities. The platform intentionally distinguishes between **design-time users** and **run-time users** to ensure operational clarity, security, and usability.

---

#### 3.1.1 Admin

**Profile**  
Platform owner or system administrator responsible for overall governance.

**Key Responsibilities**
- Manage users and roles
- Configure global system settings
- Define retention policies
- Control global visibility of tasks and workflows

**Primary Goals**
- Ensure system stability and security
- Enforce governance and standards
- Control data retention and compliance

---

#### 3.1.2 Full Designer

**Profile**  
Application support engineer, integration engineer, or reliability engineer responsible for defining monitored business transactions.

**Key Responsibilities**
- Create and manage tasks
- Design workflows visually
- Define data extraction and mutation rules
- Configure schedules and notifications

**Primary Goals**
- Accurately model real business transactions
- Ensure workflows are reliable and debuggable
- Enable effective monitoring for operators

---

#### 3.1.3 Super Operator

**Profile**  
Operations or NOC engineer responsible for day-to-day monitoring and incident response.

**Key Responsibilities**
- Monitor workflow executions
- Investigate failures
- Rerun workflows
- Add operational notes and annotations

**Primary Goals**
- Quickly understand what failed and why
- Reduce MTTR
- Operate without needing design-time permissions

---

#### 3.1.4 Read-Only Operator

**Profile**  
Viewer role for stakeholders, auditors, or support teams.

**Key Responsibilities**
- View execution history
- Inspect results and outputs

**Primary Goals**
- Gain visibility without risk of change
- Support audits and reporting

---

#### 3.1.5 Read-Only Designer

**Profile**  
Architects or reviewers who need to understand workflow design without modifying it.

**Key Responsibilities**
- View tasks and workflows
- Review logic and configuration

**Primary Goals**
- Understand system behavior
- Provide guidance or approval without direct edits

---

### 3.2 Designer Journey

This journey represents the **design-time lifecycle** of a monitored transaction.

#### Step 1: Task Creation
- Designer creates a new task or reuses an existing one
- Defines REST command, authentication method, and headers
- Configures extraction rules and output mutation
- Saves task as global or private

#### Step 2: Workflow Design
- Designer opens the visual workflow canvas
- Drags tasks from the task palette
- Connects tasks with success and failure paths
- Defines stop or continue behavior

#### Step 3: Dry Run & Debugging
- Designer executes the workflow in dry-run mode
- Reviews inputs, outputs, and extracted variables
- Adjusts task configuration until the workflow behaves as expected

#### Step 4: Scheduling & Enablement
- Designer assigns an existing schedule or creates a new one
- Defines workflow-level notifications
- Enables the workflow for execution

---

### 3.3 Operator Journey

This journey represents the **run-time operational lifecycle**.

#### Step 1: Monitoring
- Operator views the execution dashboard
- Identifies failed or degraded workflows
- Filters and searches executions by status, tag, or workflow

#### Step 2: Investigation
- Operator opens a specific workflow execution
- Reviews execution timeline and per-task status
- Inspects task inputs, outputs, HTTP codes, and extracted variables

#### Step 3: Action
- Operator reruns the workflow if applicable
- Adds notes or annotations for future reference
- Triggers notifications or escalations if required

#### Step 4: Reporting & Handover
- Operator uses dashboards or search to summarize impact
- Shares findings with designers or stakeholders

---

### 3.4 Key Journey Principles

- Designers and operators have **distinct, optimized experiences**
- Operators never need to understand workflow internals to troubleshoot
- Designers are shielded from operational noise
- Every failure is observable, reproducible, and explainable


## 4. Functional Requirements – User & Security

### 4.1 Authentication

RestMon shall provide a built-in authentication mechanism for local users in v1.

**Requirements**
- Users shall authenticate using username and password
- Passwords shall be stored encrypted using industry-standard encryption (AES-256 or equivalent)
- Passwords shall never be exposed in plain text via UI or APIs
- Authentication sessions shall be time-bound and configurable via Global Config
- Failed login attempts shall be logged for audit purposes

**Out of Scope (v1)**
- External identity providers (OIDC, SAML)
- Single Sign-On (planned for v2)

---

### 4.2 Authorization (Role-Based Access Control)

RestMon shall enforce role-based access control (RBAC) across all modules and objects.

#### 4.2.1 Roles

The following roles shall be supported in v1:
- Admin
- Full Designer
- Super Operator
- Read Only Operator
- Read Only Designer

Roles are system-defined and not user-configurable in v1.

---

#### 4.2.2 Permission Model

Permissions shall be enforced at the following levels:
- Module level (e.g., Workflow Designer, Execution View)
- Object level (e.g., specific workflows or tasks)
- Action level (view, create, edit, delete, execute)

Examples:
- Super Operators may rerun workflows but may not edit their design
- Read Only Designers may view workflow logic but may not modify tasks or connections

---

### 4.3 Ownership, Scope, and Visibility

RestMon shall support object ownership and visibility control for the following assets:
- Tasks
- Workflows
- Schedules
- Secrets

#### 4.3.1 Ownership
- Each object shall have a single owning user
- Ownership shall be recorded at creation time

#### 4.3.2 Scope
Objects shall support the following scopes:
- **Private**: visible only to the owning user
- **Global**: visible to all users with appropriate permissions

The default scope for newly created tasks and workflows shall be **Global**, unless explicitly changed by the user.

---

### 4.4 User Management

The system shall provide a user management module accessible only to Admin users.

**Capabilities**
- Create users
- Assign roles
- Enable or disable users
- Reset passwords

User deletion shall be restricted and may be disabled in favor of deactivation to preserve audit integrity.

---

### 4.5 Secrets Management

RestMon shall provide a secure mechanism for managing sensitive information such as passwords, tokens, and API keys.

**Requirements**
- Secrets shall be stored encrypted at rest
- Secrets shall be referenced by ID and never embedded directly in task definitions
- Secrets shall not be viewable or exportable once created
- Secrets shall support global and private scope

**Usage Rules**
- Tasks may reference secrets but may not read or expose their values
- Execution logs shall mask or redact sensitive values

---

### 4.6 Audit and Traceability

RestMon shall maintain audit-relevant metadata for security-sensitive actions.

**Tracked Actions**
- User creation and role changes
- Workflow and task creation, modification, and deletion
- Schedule changes
- Global configuration changes

Audit data shall be retained according to Global Config retention policies.

---

### 4.7 Security Principles

The following security principles shall guide system design:
- Least privilege access
- Clear separation between design-time and run-time capabilities
- No inbound connectivity required to execution engines
- Secure defaults with explicit opt-in for relaxed behavior


## 5. Functional Requirements – Monitoring & Signals (Core)

### 5.1 Monitoring-First Principle

RestMon is a monitoring-led platform. All automation capabilities are secondary and must be triggered by observable signals.

**Core Rule**
- No workflow shall execute without an originating signal (check result, metric threshold, or event)

Automation exists to *respond* to system state, not to replace monitoring.

---

### 5.2 Monitoring Objects

RestMon shall support the following monitoring object types in v1:
- **Checks**: Active validation of system behavior (e.g., HTTP, API, synthetic)
- **Metrics**: Numeric measurements evaluated over time
- **Events**: External or internal state changes

Each monitoring object shall produce a **Signal**.

---

### 5.3 Signal Model

A Signal represents the evaluated state of a monitoring object.

#### 5.3.1 Signal States
Signals shall support the following states:
- **Healthy**
- **Degraded**
- **Failed**
- **Unknown**

State transitions must be explicit and traceable.

---

### 5.4 State Evaluation & Thresholds

#### 5.4.1 Checks
- Checks shall define success and failure criteria
- Check execution frequency shall be configurable
- Timeout and retry behavior shall be defined per check

#### 5.4.2 Metrics
- Metrics shall support static thresholds (v1)
- Evaluation windows shall be configurable
- Breach duration shall be configurable to avoid flapping

**Out of Scope (v1)**
- Dynamic baselining
- ML-based anomaly detection

---

### 5.5 Flapping & Noise Control

RestMon shall include basic noise-reduction mechanisms in v1.

**Mechanisms**
- Consecutive failure thresholds
- Cooldown periods between state transitions
- Explicit recovery conditions

The goal is to protect operators from alert fatigue.

---

### 5.6 Signal Metadata

Each Signal shall include the following metadata:
- Source object ID
- Source type (Check / Metric / Event)
- Timestamp
- Previous state
- Current state
- Severity
- Correlation key(s)

Metadata must be preserved for correlation and audit purposes.

---

### 5.7 Monitoring Views

RestMon shall provide operator-focused monitoring views.

**Required Views**
- Current system health overview
- Signal timeline (state changes over time)
- Failed and degraded signals prioritized by severity

Monitoring views must:
- Be read-only for Operators
- Avoid exposing workflow or automation internals

---

### 5.8 Signal-to-Workflow Mapping

Signals may be mapped to workflows via explicit rules.

**Rules**
- Mapping is optional
- Mapping is state-aware (e.g., only on Failed → Degraded)
- Multiple signals may trigger the same workflow

Workflows shall never poll monitoring state directly.

---

### 5.9 Design Constraints

- Monitoring logic must be deterministic
- Signal evaluation must be explainable
- All state transitions must be observable in the UI

This section defines the **non-negotiable core** of RestMon.

## 6. Functional Requirements – Workflow Execution & Temporal Integration

### 6.1 Execution Philosophy

Workflow execution in RestMon exists to respond to signals, not to replace human reasoning.

**Guiding Principles**
- Executions must be deterministic
- Executions must be observable
- Executions must be restartable without side effects
- Operators must trust the system under failure

Temporal is used as the execution backbone to enforce these principles.

---

### 6.2 Temporal as the Execution Engine

RestMon shall use Temporal for workflow orchestration and execution.

**Rationale**
- Durable execution across process and node failures
- Native retry, timeout, and backoff semantics
- Deterministic workflow state replay
- Clear separation between orchestration and task execution

Temporal is an internal implementation detail and shall not be exposed directly to end users.

---

### 6.3 Workflow Definition Model

A Workflow is a directed graph of Tasks triggered by a Signal.

**Workflow Characteristics**
- Workflows are versioned
- Workflow definitions are immutable once published
- Changes require creation of a new version

This prevents execution drift and supports auditability.

---

### 6.4 Task Model

Tasks represent atomic execution units.

**Task Properties**
- Deterministic input and output
- Explicit success and failure states
- Configurable timeout and retry policy
- Idempotent by design

Tasks may interact with external systems but must be designed to tolerate retries.

---

### 6.5 Execution Lifecycle

Each workflow execution shall follow a well-defined lifecycle:
1. Triggered by Signal
2. Execution context created
3. Tasks executed sequentially or in parallel
4. Success or failure determined
5. Execution state recorded

Execution state must survive restarts and failures.

---

### 6.6 Retries, Timeouts, and Backoff

Retries and timeouts shall be first-class concepts.

**Requirements**
- Retry policy configurable per task
- Exponential backoff supported
- Max retry count enforced
- Timeouts enforced at task level

Operators must see retry behavior clearly in execution views.

---

### 6.7 Idempotency & Side Effects

Tasks must declare their idempotency behavior.

**Rules**
- Tasks interacting with external systems must include idempotency keys where possible
- Non-idempotent tasks must explicitly declare risk
- Temporal replay must not cause unintended side effects

---

### 6.8 Operator Controls

Operators shall have limited, safe controls over executions.

**Allowed Actions**
- View execution status
- View execution history and task logs
- Rerun failed executions
- Acknowledge execution failures

**Disallowed Actions**
- Editing workflow logic
- Modifying task parameters at runtime

---

### 6.9 Execution Observability

Execution observability is mandatory.

**Required Visibility**
- Current execution state
- Task-level progress
- Retry attempts and reasons
- Failure causes

Executions must be explainable without inspecting Temporal internals.

---

### 6.10 Failure Handling Philosophy

Failures are expected and must be safe.

**Rules**
- Failed executions must not corrupt workflow state
- Partial execution state must be preserved
- Recovery must prefer rerun over manual repair

This ensures operational confidence and system resilience.

## 7. UX & Interaction Model

### 7.1 Design Philosophy

RestMon’s UX philosophy emphasizes clarity, speed, and monitoring-first thinking.

**Principles**
- **Operator-first:** The primary goal is to quickly identify failures and take action.
- **Designer-friendly:** Visual workflow design using drag-and-drop, inspired by n8n.
- **No noise:** Only actionable information is presented; irrelevant data is hidden.
- **Consistency:** Patterns for tasks, workflows, and notifications remain consistent.
- **Responsive:** Works well on multiple screen sizes.

---

### 7.2 Designer Canvas

The Designer Canvas is where workflows are visually constructed.

**Features**
- **Drag-and-Drop Task Palette:** Tasks (including reusable and notification tasks) can be dragged onto the canvas.
- **Task Connections:** Success and failure paths are visually represented with arrows.
- **Accordion/Tab Task Config:** Clicking a task opens configuration panel with tabs for Command, Variables, Output, and Status Mapping.
- **Workflow Dry Run:** Designer can execute a workflow in dry-run mode, observing input/output and variable extraction.
- **Duplication & Reuse:** Tasks and entire workflows can be duplicated, copied, or reused across workflows.
- **Inline Notes:** Designers can add notes per task or workflow for operator guidance.
- **Tags & Search:** Global tag system for filtering and quick retrieval.

**UX Patterns Inspired By**
- n8n (drag-drop, task config accordion)
- NiFi (workflow flow visual cues, conditional routing)

---

### 7.3 Operator Dashboard

The Operator Dashboard is a read-only, monitoring-centric interface.

**Features**
- **Execution Overview:** Lists all workflows with current execution status.
- **Search & Filtering:** Search by workflow name, tasks, tags, HTTP response codes, or extracted variables.
- **Execution Timeline:** Shows task-level progress, retries, and status changes.
- **Detailed View:** Input/output of each task, extracted variables, execution duration.
- **Rerun Controls:** Operators may rerun failed workflows safely.
- **Annotations:** Operators can add notes to executions for audit and collaboration.

**Design Guidelines**
- Avoid workflow design in operator view.
- Focus on failure points and recovery options.
- Highlight status visually (green/yellow/red, icons for degraded, failed).
- Provide drill-down capability for audit and RCA purposes.

---

### 7.4 Scheduling Interface

Scheduling is visual and intuitive.

**Features**
- Reusable schedule definitions with drag-and-drop assignments
- Configure recurrence (minutes, hours, days, weeks, specific dates/times)
- View workflows attached to each schedule
- Duplicate, edit, delete schedules
- Visual calendar view for high-level planning

---

### 7.5 Notifications UX

Notification configuration integrates with workflows.

**Features**
- Notification tasks as part of workflow palette
- Workflow-level notifications for success/failure
- Supports multiple notification types (REST API, Email)
- Visual mapping of output variables to notification payloads
- Reuse of notification tasks across workflows

---

### 7.6 General UI Conventions

- **Three-dot menus** for object-level actions (edit, duplicate, delete)
- Drag-and-drop for reordering tasks or workflows
- Tooltips and inline help for complex fields
- Use consistent color coding for states, errors, and warnings
- Responsive layout for laptop and large monitors

### 7.7 Accessibility & Responsiveness

- Keyboard navigation for critical actions
- Clear contrast for colors indicating status
- Responsive resizing of canvas and panels
- Mobile or tablet support not mandatory in v1 (future consideration for v2)


## 8. V1 vs V2 Boundaries & Roadmap

This section defines the features that will be delivered in RestMon **v1** and separates them from planned enhancements for **v2**. This ensures focus on a Minimum Viable Product that is operationally reliable and commercially viable.

---

### 8.1 V1 Scope – Core Product

**Functional Scope:**
- Workflow Designer (drag-and-drop, visual task connections)
- Task creation with:
  - Command execution (REST calls, authentication)
  - Variable extraction (JSON, XML)
  - Output mutation (CSV, JSON, XML)
  - Status mapping (HTTP codes)
- Workflow execution via Temporal:
  - Deterministic execution
  - Retry, timeout, idempotency
  - Dry-run mode
- Scheduling Module:
  - Reusable schedules
  - Recurrence by minutes, hours, days, specific dates/times
- Notifications:
  - REST API and email notification tasks
  - Workflow-level notification mapping
- Operator Dashboard:
  - Execution status overview
  - Task-level execution details
  - Rerun failed executions
- Search:
  - Global search by workflow, tasks, tags, outputs, variables
- User & Role Management (RBAC):
  - Admin, Full Designer, Super Operator, Read-only roles
- Secrets Management:
  - Encrypted storage
  - Scoped usage in tasks
- Monitoring Signals (checks, metrics, events):
  - Healthy, degraded, failed, unknown states
  - Basic threshold evaluation and noise reduction
- Audit logs and retention policies (configurable)

**UX Scope:**
- Designer canvas inspired by n8n and NiFi
- Operator dashboard focused on observability
- Visual schedule and notification configuration
- Responsive design for laptop and desktop

**Technical Scope:**
- Frontend: React + React Flow, TanStack Query
- Backend: Node.js/NestJS, PostgreSQL (JSONB), REST API
- Execution Engine: Go + Temporal, pub/sub for configuration sync
- Security: AES-256 for secrets, TLS optional for communication
- Reporting: Grafana dashboards connected to PostgreSQL

---

### 8.2 V2 Scope – Planned Enhancements

**UX & Designer Enhancements:**
- Drag-and-drop CSV/JSON mutation builder with live preview
- Visual variable mapping between tasks
- Multi-user collaboration features
- Enhanced accessibility and mobile support

**Execution & Monitoring Enhancements:**
- Advanced metrics (time series, SLA violation detection)
- ML-based anomaly detection for degraded states
- Real-time signal correlation and event chaining
- Cross-workflow signal triggers

**Security & Integration Enhancements:**
- Single Sign-On (SSO) with OIDC/SAML
- External secrets vault integration (Vault, AWS KMS)
- Fine-grained permission rules per task and workflow

**Operational Enhancements:**
- Historical trend dashboards
- Workflow dependency visualization
- Execution replay across multiple time windows
- Retention policies with tiered storage (hot/cold)

**Commercial Enhancements:**
- API marketplace for reusable tasks and workflows
- Multi-tenant architecture
- Usage-based analytics and billing

---

### 8.3 Roadmap Principles

- **Monitoring-first**: All new features must enhance observability or improve operator trust.
- **Safe defaults**: v1 focuses on stability; advanced automation features are deferred to v2.
- **Reusability**: Every design-time element (task, workflow, schedule) must be reusable in v1.
- **Extensibility**: Configuration-driven fields, plugin hooks, and Temporal allow v2 expansion without database or engine redesign.


## 9. Architecture & Deployment

### 9.1 High-Level Architecture

RestMon is designed as a distributed, modular platform to separate concerns between the UI, master server, and execution engines.

**Components:**
1. **Frontend (Designer & Operator Dashboard)**
   - React-based, communicates via REST API with the Master Server
   - Provides visual workflow designer and operator views
   - Handles drag-and-drop, configuration panels, and visualization

2. **Master Server**
   - Node.js (NestJS) or Go backend
   - Stores all configuration, tasks, workflows, schedules, and audit data in PostgreSQL (JSONB for flexible schema)
   - Exposes REST API to frontends and execution engines
   - Manages RBAC, user authentication, and secrets

3. **Execution Engine (Worker)**
   - Written in Go for lightweight deployment
   - Connects to Master Server via REST and optional TLS
   - Pulls workflow/task updates via pub/sub (NATS or Redis)
   - Executes workflows using Temporal
   - Reports execution results back to Master Server

4. **Database**
   - PostgreSQL for metadata, workflow definitions, execution history, and task output
   - JSONB columns allow dynamic task field management without schema migration

5. **Reporting Layer**
   - Grafana connects to PostgreSQL for dashboards
   - Read-only visualizations for executive and operator insights

---

### 9.2 Deployment Model

**Principles:**
- Master Server is central and manages all workflows, schedules, and configuration
- Execution Engines can be distributed across multiple machines or data centers
- Execution Engines **pull** configuration; Master Server never pushes
- Frontend communicates only with Master Server
- TLS is optional but recommended for all communications

**Deployment Topology:**
- **Single-master, multiple workers**
- Master Server behind firewall; execution engines in DMZ or internal networks as needed
- Grafana can be installed on same network as Master Server for monitoring dashboards

---

### 9.3 Pub/Sub Communication

- Master Server publishes configuration updates to NATS/Redis channels
- Execution Engines subscribe to updates and fetch changed workflows/tasks
- Ensures eventual consistency without direct inbound connections to execution engines
- Supports scaling with multiple distributed workers

---

### 9.4 Execution Engine Design

- Runs Temporal worker to execute workflows
- Each worker is stateless beyond current workflow execution
- Worker logs execution results and status to Master Server
- Worker can handle thousands of concurrent tasks
- Designed for resilience; can restart without losing workflow state

---

### 9.5 Security & Isolation

- Execution Engines initiate all connections (no inbound access from Master Server)
- Sensitive data (passwords, tokens) encrypted at rest and in transit
- Secrets never exposed to logs or frontend
- Role-based access ensures separation between designers and operators

---

### 9.6 Scalability & Extensibility

- New execution engines can be added without downtime
- JSONB and flexible task definitions allow future field additions without DB schema changes
- Temporal allows adding workflows and retry policies without modifying engine code
- Pub/Sub decouples Master Server from Worker scaling

---

### 9.7 Disaster Recovery Considerations

- Master Server should have regular database backups
- Execution Engines are stateless; can be redeployed without data loss
- Temporal ensures workflow state durability even if engine fails
- Retention policies managed in Global Config for execution history

## 10. Reporting, Metrics & Observability

### 10.1 Reporting Philosophy

Reporting in RestMon is designed to provide operators and executives with actionable insights without overwhelming them with unnecessary detail. 

**Principles:**
- **Monitoring-led:** Reports focus on system health, workflow success/failure, and extracted metrics.
- **Operator actionable:** Each report allows drill-down to specific workflow or task execution.
- **Historical:** Metrics and execution history are preserved according to retention policies.
- **Visual & intuitive:** Dashboards are clean, color-coded, and easy to interpret.

---

### 10.2 Reporting Components

1. **Execution Metrics:**
   - Workflow execution counts (success, failure, in-progress)
   - Task-level execution duration
   - Retry attempts
   - Average execution duration per workflow/task

2. **Monitoring Metrics:**
   - Health status (Healthy, Degraded, Failed) over time
   - Metrics extracted from task outputs (JSON, XML)
   - SLA compliance and threshold breaches

3. **Operational Metrics:**
   - Number of workflows per designer
   - Task reuse frequency
   - Schedule utilization and execution counts

4. **Audit Metrics:**
   - User activity (login, workflow edits, role changes)
   - Secrets access and usage
   - System configuration changes

---

### 10.3 Grafana Integration

- Grafana connects directly to PostgreSQL to extract metrics and execution logs
- Dashboards support both **real-time** and **historical** views
- Customizable dashboards allow users to create visualizations based on tags, workflow names, or extracted variables
- Grafana alerts can be optionally configured to notify operators of recurring failures or SLA violations

---

### 10.4 Observability Requirements

- All workflow executions must emit structured logs including:
  - Workflow ID and name
  - Task ID and name
  - Execution status (Success/Failure/Degraded)
  - Input and output variables (sensitive fields masked)
  - Execution duration and retry attempts
  - Execution timestamp and operator notes

- Logs must be queryable to support root-cause analysis and audits
- Execution history and logs must comply with retention policies defined in Global Config

---

### 10.5 KPI Dashboards

- **Workflow Success Rate:** Success vs Failure over time per workflow
- **Task Reliability:** Task success rate and average execution time
- **Operator Response Time:** Time to acknowledge or rerun failed executions
- **Schedule Adherence:** Percentage of workflows executing according to their schedule

---

### 10.6 Extensibility for v2

- ML-based trend analysis and anomaly detection
- Correlation of multiple signals for predictive alerts
- Multi-tenant reporting dashboards
- Advanced KPI customization and export capabilities

## 11. Security, Secrets & Compliance

### 11.1 Security Principles

RestMon is designed to protect sensitive data, enforce access control, and maintain auditability.

**Core Principles:**
- **Least Privilege:** Users only have access to features permitted by their role.
- **Separation of Duties:** Designers and Operators have distinct privileges.
- **Secure by Default:** Secrets and credentials are encrypted at rest and in transit.
- **Auditability:** All sensitive actions are logged for compliance and investigation.

---

### 11.2 User Roles & Access Control

**V1 Roles:**
1. **Admin:** Full control of system, users, workflows, schedules, and notifications.
2. **Full Designer:** Create/edit workflows and tasks, manage global tasks and schedules.
3. **Super Operator:** View workflows, rerun failed executions, see execution history.
4. **Read-Only Operator:** View execution status and history only.
5. **Read-Only Designer:** View workflow and task design without editing rights.

Access control enforced at API, UI, and data level.

---

### 11.3 Secrets Management

- All sensitive data (passwords, tokens, API keys) encrypted with AES-256
- Secrets stored in database JSONB fields with field-level encryption
- Secrets never displayed in logs or UI
- Tasks can reference secrets using a secure variable mapping
- Optionally integrate with external vaults (planned for v2)

---

### 11.4 Credential Usage in Tasks

- Tasks may use one of the following authentication methods:
  - Basic Auth (username/password)
  - JWT tokens (retrieved via login task)
  - OAuth/Other (v2 planned)

- Task execution engine injects secrets into runtime environment securely
- Secrets scoped to task/workflow execution context; no global exposure

---

### 11.5 Communication Security

- REST API communication between Frontend, Master Server, and Execution Engine supports TLS
- Execution Engine initiates all connections; Master Server never initiates inbound connections
- Optional mutual TLS for enhanced security

---

### 11.6 Compliance & Auditability

- All changes to workflows, tasks, schedules, and user accounts logged with timestamps and user IDs
- Execution logs include task input/output metadata (sensitive fields masked)
- Audit logs retained per Global Config retention policy
- Supports compliance requirements for enterprise environments (e.g., SOC2, ISO 27001, internal IT policies)

---

### 11.7 Security Considerations for v2

- Integration with enterprise SSO (OIDC/SAML)
- Multi-tenant RBAC
- External secrets vault integration (Vault, AWS KMS, Azure Key Vault)
- Advanced encryption key rotation and audit

## 12. Global Configuration & Maintenance

### 12.1 Global Configuration Principles

Global configuration allows system-wide parameters to be centrally defined, controlling workflow execution, retention, security, and operational policies.

**Principles:**
- **Centralized Control:** Admins can manage global settings from a single interface
- **Flexible Defaults:** Defaults apply to all workflows/tasks but can be overridden locally
- **Dynamic Update:** Changes propagate to execution engines without requiring redeployment
- **Auditability:** All changes are logged

---

### 12.2 Retention Policies

**Execution History:**
- Failed workflow/task executions retention period configurable
- Successful workflow/task executions retention period configurable
- Clean-up module automatically deletes records past retention period
- Retention periods stored in Global Config

**Audit & Logs:**
- User actions and configuration changes logged with timestamps
- Logs retained per retention policy

---

### 12.3 Task Field Configuration

- Task fields configurable via JSON configuration files
- Field types supported: text, number, date, time, datetime, list, true/false, password
- Password fields stored encrypted and never displayed in UI
- Adding new fields does not require schema changes
- Execution engine respects dynamic fields during runtime

---

### 12.4 Cleanup Module

- Periodically removes old execution records according to retention policy
- Separate retention periods for successful and failed executions
- Maintains minimal required history for audit, compliance, and reporting
- Configurable via Global Config

---

### 12.5 Scheduler Configuration

- Schedules are reusable and can be centrally managed
- Global Config defines default schedule behaviors and limits
- Changes propagate to workflows using the schedule without workflow edits

---

### 12.6 Maintenance & Updates

- Execution engines automatically fetch configuration updates via pub/sub
- Master Server manages schema-less updates for tasks and workflows
- Admins can trigger full system sync for critical updates
- Database migrations minimized due to JSONB flexible schema

---

### 12.7 Extensibility for v2

- Advanced scheduling policies and SLA enforcement
- Tiered retention (hot/cold) with archive support
- Global configuration for multi-tenant deployments
- Dynamic plugin integration for tasks and notification types

## 13. Technical Considerations & Scaling

### 13.1 Scalability Principles

RestMon is designed for horizontal scalability to handle high volumes of workflow executions and API monitoring tasks.

**Principles:**
- **Distributed Execution Engines:** Multiple workers can execute workflows concurrently
- **Stateless Workers:** Execution engines are stateless beyond current execution context, allowing easy scaling and failover
- **Centralized Configuration:** Master Server manages workflow/task definitions and propagates changes to all workers via pub/sub
- **Elastic Scaling:** Execution engines can be added or removed dynamically without system downtime

---

### 13.2 Performance Considerations

- Temporal ensures deterministic execution and retries without blocking other workflows
- Database queries optimized using JSONB indexing for dynamic task fields and workflow metadata
- Execution engines support concurrent REST API calls and can handle thousands of tasks per engine
- Scheduling logic optimized to avoid polling overhead; uses event-driven triggers where possible

---

### 13.3 Fault Tolerance

- **Worker Failures:** Temporal handles automatic retries; workflow state is durable and replayable
- **Master Server Failures:** Must be deployed in a highly available configuration (e.g., clustering or container orchestration with failover)
- **Database Failures:** Backup and replication strategies recommended for PostgreSQL
- **Network Failures:** Workers retry connections to Master Server; no inbound connections required

---

### 13.4 Distributed Architecture Considerations

- Execution engines communicate with Master Server via REST API over optional TLS
- Pub/Sub system (NATS or Redis) ensures eventual consistency for configuration updates
- Workers report execution results back to Master Server asynchronously
- System designed to avoid single points of failure

---

### 13.5 Observability & Monitoring

- Execution metrics, task logs, and operator annotations collected centrally
- Grafana dashboards visualize workflow health, task success rates, and execution trends
- Alerting supported via notifications and Grafana
- Execution and system logs retained according to configurable retention policies

---

### 13.6 Extensibility Considerations

- JSONB-based schema allows dynamic task fields and workflow metadata without schema migration
- Temporal allows adding new workflow types, tasks, and retry policies without modifying execution engine code
- Pub/Sub ensures seamless propagation of changes to multiple distributed workers
- Future v2 enhancements (ML analytics, multi-tenancy, advanced notifications) can be integrated without major architectural changes

## 14. V1 Testing & Validation Strategy

### 14.1 Testing Principles

- **Monitoring-first validation:** Ensure all workflows produce observable, traceable results.
- **Reproducibility:** All tests can be repeated with deterministic results.
- **Automation where possible:** Automated tests for workflows, tasks, and execution engine behavior.
- **User-centric:** Validate UX and operator experience alongside functional correctness.

---

### 14.2 Testing Levels

1. **Unit Testing**
   - Task-level logic
   - Variable extraction and output mutation
   - Status mapping based on HTTP response codes

2. **Integration Testing**
   - Workflow execution across multiple tasks
   - Scheduler integration with workflow execution
   - Notification delivery (REST API and email tasks)
   - Secrets injection and secure handling

3. **End-to-End Testing**
   - Designer dry-run mode validation
   - Operator dashboard execution and rerun capabilities
   - Workflow failure and retry scenarios
   - Global configuration propagation

4. **Load & Performance Testing**
   - Concurrent workflow executions across multiple execution engines
   - High volume REST API calls
   - Stress testing for scheduler and pub/sub updates

5. **Security & Compliance Testing**
   - RBAC enforcement for all roles
   - Secrets encryption verification
   - TLS communication testing
   - Audit log completeness

---

### 14.3 Validation Scenarios

- **Happy Path:** Workflow executes successfully end-to-end, variables extracted correctly, notifications delivered
- **Failure Path:** Task failure triggers correct conditional flow, execution logged, operator alerted
- **Edge Cases:** Invalid inputs, malformed API responses, missing variables, network interruptions
- **Reusability Checks:** Task reuse across multiple workflows without conflict
- **Schedule Validation:** Scheduled execution triggers at correct times, repeat/cancel behavior works

---

### 14.4 Acceptance Criteria for v1

- All core workflows execute successfully in dry-run and live modes
- Operator dashboard accurately reflects workflow execution status and details
- Notifications are delivered correctly and mapped variables are accurate
- Scheduler triggers workflows according to configuration
- RBAC enforced correctly and secrets protected
- Execution history, logs, and metrics retained as per Global Config
- System resilient under load and supports multiple distributed workers

## 15. Glossary & Definitions

- **Workflow:** A sequence of tasks visually designed to perform a series of REST API calls and processing steps.
- **Task:** The smallest unit of work in a workflow, can execute a REST API call, extract variables, mutate output, or send notifications.
- **Execution Engine (Worker):** Distributed service that runs workflows using Temporal, reports results back to the Master Server.
- **Master Server:** Central server storing all configurations, workflows, tasks, schedules, and managing communication with Execution Engines.
- **Designer:** User role responsible for creating and editing workflows and tasks.
- **Operator:** User role responsible for monitoring workflow executions, reruns, and reviewing execution history.
- **RBAC (Role-Based Access Control):** Mechanism controlling user access to system features based on role.
- **Notification Task:** Special task type used to notify users or trigger workflows upon specific workflow events.
- **Schedule:** Reusable timing configuration that defines when workflows should execute.
- **Dry-Run:** Mode where workflow execution is simulated without sending actual API requests, used for debugging and validation.
- **Variable Extraction:** Process of capturing specific data from API responses for use in subsequent tasks or workflows.
- **Mutation/Output Transformation:** Reformatting API response data into desired output structures like JSON, CSV, or XML.
- **GUID (Globally Unique Identifier):** Unique identifier automatically assigned to tasks and workflows for tracking and reuse.
- **JSONB:** PostgreSQL data type allowing storage of JSON data with indexing support, used for flexible task and workflow fields.
- **Pub/Sub:** Publish/Subscribe messaging mechanism used to propagate configuration changes from Master Server to Execution Engines.
- **Retention Policy:** Configuration defining how long execution history, logs, and audit records are stored.
- **Dry-Run Execution:** Simulation of workflow execution to validate configuration without performing actual API calls.
- **Temporal:** Workflow orchestration engine ensuring deterministic execution, retries, and workflow state persistence.
- **Grafana:** Visualization and reporting tool used to create dashboards and monitor system metrics.
- **Secrets Management:** Secure storage and usage of sensitive data such as passwords, API keys, or tokens.
- **TLS (Transport Layer Security):** Protocol to secure communication between components.
