import { Workflow } from '@restmon/shared-types';

const API_BASE_URL = '/api';

async function handleResponse(response: Response) {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    }
    return response.json();
}

export const workflowsApi = {
    getWorkflows: async (): Promise<Workflow[]> => {
        const response = await fetch(`${API_BASE_URL}/workflows`);
        return handleResponse(response);
    },

    getWorkflow: async (id: string): Promise<Workflow> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}`);
        return handleResponse(response);
    },

    createWorkflow: async (data: Partial<Workflow>): Promise<Workflow> => {
        const response = await fetch(`${API_BASE_URL}/workflows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    updateWorkflow: async (id: string, data: Partial<Workflow>): Promise<Workflow> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    deleteWorkflow: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
        }
    },

    executeWorkflow: async (id: string): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}/execute`, {
            method: 'POST',
        });
        return handleResponse(response);
    },

    getWorkflowExecutions: async (id: string): Promise<any[]> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}/executions`);
        return handleResponse(response);
    },

    getAllExecutions: async (): Promise<any[]> => {
        const response = await fetch(`${API_BASE_URL}/workflows/executions/all`);
        return handleResponse(response);
    },

    getExecutionDetail: async (id: string): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/workflows/executions/${id}`);
        return handleResponse(response);
    },
    deleteWorkflowExecution: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/workflows/executions/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
        }
    },
};
