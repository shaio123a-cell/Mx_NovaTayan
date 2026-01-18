import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const { executeHttpRequest, extractVariables } = proxyActivities<typeof activities>({
    startToCloseTimeout: '1 minute',
});

/**
 * Execute a single task workflow
 */
export async function executeTask(taskConfig: {
    taskId: string;
    taskName: string;
    command: {
        method: string;
        url: string;
        headers?: Record<string, string>;
        body?: string;
        timeout?: number;
    };
    variableExtractions?: Array<{
        variableName: string;
        jsonPath?: string;
        regex?: string;
        defaultValue?: string;
    }>;
}): Promise<{
    taskId: string;
    taskName: string;
    statusCode: number;
    responseBody: string;
    extractedVariables: Record<string, string>;
}> {
    // Execute HTTP request
    const response = await executeHttpRequest(taskConfig.command);

    // Extract variables if configured
    let extractedVariables: Record<string, string> = {};
    if (taskConfig.variableExtractions) {
        extractedVariables = await extractVariables(
            response.body,
            taskConfig.variableExtractions
        );
    }

    return {
        taskId: taskConfig.taskId,
        taskName: taskConfig.taskName,
        statusCode: response.statusCode,
        responseBody: response.body,
        extractedVariables,
    };
}

/**
 * Execute a complete workflow with multiple tasks
 */
export async function executeWorkflow(workflowConfig: {
    workflowId: string;
    tasks: Array<any>; // Simplified for now
}): Promise<{
    workflowId: string;
    status: string;
    results: Array<any>;
}> {
    // Placeholder - will implement graph execution logic
    const results: any[] = [];

    return {
        workflowId: workflowConfig.workflowId,
        status: 'SUCCESS',
        results,
    };
}
