/**
 * Core domain types for RestMon
 * These types are shared across Frontend, Backend, and Worker
 */

// ============================================================================
// User & Security
// ============================================================================

export enum UserRole {
    ADMIN = 'ADMIN',
    FULL_DESIGNER = 'FULL_DESIGNER',
    SUPER_OPERATOR = 'SUPER_OPERATOR',
    READ_ONLY_OPERATOR = 'READ_ONLY_OPERATOR',
    READ_ONLY_DESIGNER = 'READ_ONLY_DESIGNER',
}

export interface User {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export enum ScopeType {
    PRIVATE = 'PRIVATE',
    GLOBAL = 'GLOBAL',
}

export interface Secret {
    id: string;
    name: string;
    description?: string;
    scope: ScopeType;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    // Value is never exposed in the API response
}

// ============================================================================
// Task Definition
// ============================================================================

export enum AuthenticationType {
    NONE = 'NONE',
    BASIC = 'BASIC',
    BEARER = 'BEARER',
    API_KEY = 'API_KEY',
    OAUTH2 = 'OAUTH2',
}

export interface AuthenticationConfig {
    type: AuthenticationType;
    secretId?: string; // Reference to Secret
    headerName?: string; // For API_KEY
    tokenUrl?: string; // For OAUTH2
}

export interface HttpRequestConfig {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: string; // JSON string or template
    timeout?: number; // milliseconds
    authentication?: AuthenticationConfig;
}

export interface VariableExtraction {
    variableName: string;
    jsonPath?: string; // JSONPath expression
    xmlPath?: string; // XPath expression
    regex?: string; // Regex pattern
    defaultValue?: string;
}

export enum OutputFormat {
    JSON = 'JSON',
    XML = 'XML',
    CSV = 'CSV',
    TEXT = 'TEXT',
}

export interface OutputMutation {
    format: OutputFormat;
    transformTemplate?: string; // Handlebars or similar template
}

export interface StatusMapping {
    httpCode: number;
    mappedStatus: 'SUCCESS' | 'FAILURE' | 'DEGRADED';
}

export interface TaskGroup {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Task {
    id: string;
    name: string;
    description?: string;
    scope: ScopeType;
    ownerId: string;

    // Core command configuration
    command: HttpRequestConfig;

    // Data extraction and transformation
    variableExtractions?: VariableExtraction[];
    outputMutation?: OutputMutation;
    statusMappings?: StatusMapping[];

    // Retry and timeout
    retryPolicy?: {
        maxAttempts: number;
        backoffMultiplier?: number;
        initialInterval?: number; // milliseconds
    };

    // Metadata
    tags?: string[];
    groups?: TaskGroup[];
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// Workflow Definition
// ============================================================================

export interface WorkflowNode {
    id: string; // Unique node ID in the workflow
    taskId: string; // Reference to Task
    position: {
        x: number;
        y: number;
    };
    label?: string; // Optional display label
}

export interface WorkflowEdge {
    id: string;
    source: string; // Source node ID
    target: string; // Target node ID
    condition: 'ON_SUCCESS' | 'ON_FAILURE' | 'ALWAYS';
    label?: string;
}

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    scope: ScopeType;
    ownerId: string;
    version: number;

    // Graph definition (compatible with React Flow)
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];

    // Scheduling
    scheduleId?: string; // Reference to Schedule
    enabled: boolean;

    // Metadata
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// Execution & Monitoring
// ============================================================================

export enum ExecutionStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    DEGRADED = 'DEGRADED',
    CANCELLED = 'CANCELLED',
}

export interface TaskExecutionResult {
    nodeId: string; // Workflow node ID
    taskId: string;
    taskName: string;

    status: ExecutionStatus;
    startedAt: Date;
    completedAt?: Date;
    duration?: number; // milliseconds

    // HTTP details
    httpStatusCode?: number;
    requestUrl?: string;
    requestBody?: string;
    responseBody?: string;

    // Extracted variables
    extractedVariables?: Record<string, string>;

    // Error info
    errorMessage?: string;
    retryCount?: number;
}

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    workflowName: string;
    workflowVersion: number;

    status: ExecutionStatus;
    triggeredBy: 'SCHEDULE' | 'MANUAL' | 'SIGNAL';
    triggeredByUser?: string;

    startedAt: Date;
    completedAt?: Date;
    duration?: number; // milliseconds

    // Task-level results
    taskExecutions: TaskExecutionResult[];

    // Operator annotations
    notes?: string;

    createdAt: Date;
}

// ============================================================================
// Schedule
// ============================================================================

export enum RecurrenceType {
    ONCE = 'ONCE',
    MINUTES = 'MINUTES',
    HOURS = 'HOURS',
    DAYS = 'DAYS',
    WEEKS = 'WEEKS',
    CRON = 'CRON',
}

export interface Schedule {
    id: string;
    name: string;
    description?: string;
    scope: ScopeType;
    ownerId: string;

    recurrenceType: RecurrenceType;
    recurrenceValue?: number; // e.g., every 5 minutes
    cronExpression?: string; // For CRON type

    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// Signals & Monitoring
// ============================================================================

export enum SignalState {
    HEALTHY = 'HEALTHY',
    DEGRADED = 'DEGRADED',
    FAILED = 'FAILED',
    UNKNOWN = 'UNKNOWN',
}

export enum SignalSourceType {
    CHECK = 'CHECK',
    METRIC = 'METRIC',
    EVENT = 'EVENT',
}

export interface Signal {
    id: string;
    sourceId: string;
    sourceType: SignalSourceType;

    previousState: SignalState;
    currentState: SignalState;

    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message?: string;

    timestamp: Date;
    correlationKeys?: Record<string, string>;
}

// ============================================================================
// Worker Management
// ============================================================================

export interface Worker {
    id: string;
    name?: string;
    hostname: string;
    ipAddress?: string;
    status: 'ONLINE' | 'OFFLINE' | 'DISABLED';
    workerGroup: string;
    lastSeen: Date;
    createdAt: Date;
    updatedAt: Date;
}
