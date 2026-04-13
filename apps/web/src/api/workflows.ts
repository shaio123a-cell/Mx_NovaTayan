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
    getWorkflows: async (folderId?: string): Promise<Workflow[]> => {
        const url = folderId ? `${API_BASE_URL}/workflows?folderId=${folderId}` : `${API_BASE_URL}/workflows`;
        const response = await fetch(url);
        return handleResponse(response);
    },
    reorderWorkflow: async (id: string, order: number): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}/reorder`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order }),
        });
        await handleResponse(response);
    },
    getSystemStats: async (folderId?: string): Promise<any> => {
        const url = folderId ? `${API_BASE_URL}/workflows/stats?folderId=${folderId}` : `${API_BASE_URL}/workflows/stats`;
        const response = await fetch(url);
        return handleResponse(response);
    },

    getWorkflow: async (id: string): Promise<Workflow> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}`);
        return handleResponse(response);
    },
    getWorkflowUsage: async (id: string): Promise<{ usageCount: number, dependents: any[], activeInputKeys?: string[], activeOutputKeys?: string[] }> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}/usage`);
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
    terminateExecution: async (id: string): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/workflows/executions/${id}/terminate`, {
            method: 'POST',
        });
        return handleResponse(response);
    },
    
    // Scheduling Bindings
    getBindings: async (id: string): Promise<any[]> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${id}/bindings`);
        return handleResponse(response);
    },
    createBinding: async (workflowId: string, data: any): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/bindings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },
    updateBinding: async (workflowId: string, bindingId: string, data: any): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/bindings/${bindingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },
    deleteBinding: async (workflowId: string, bindingId: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/bindings/${bindingId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete binding');
    },

    // Webhook Trigger Tokens
    getTokens: async (workflowId: string): Promise<any[]> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/tokens`);
        return handleResponse(response);
    },
    createToken: async (workflowId: string, data: any): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/tokens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },
    updateToken: async (workflowId: string, tokenId: string, data: any): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/tokens/${tokenId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },
    deleteToken: async (workflowId: string, tokenId: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/tokens/${tokenId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete token');
    },

    // Webhook Listen Mode
    startListening: async (workflowId: string, tokenId: string): Promise<{ listening: boolean, expiresAt: string }> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/tokens/${tokenId}/listen`, {
            method: 'POST',
        });
        return handleResponse(response);
    },
    getSample: async (workflowId: string, tokenId: string): Promise<{ ready: boolean, body?: any, headers?: any, query?: any, expired?: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/tokens/${tokenId}/sample`);
        return handleResponse(response);
    },
    stopListening: async (workflowId: string, tokenId: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/tokens/${tokenId}/listen`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to stop listening');
    },
    // Workflow Folders
    getFolderTree: async (): Promise<any[]> => {
        const response = await fetch(`${API_BASE_URL}/workflows/folders/all`);
        return handleResponse(response);
    },

    createFolder: async (data: { name: string; description?: string; parentId?: string }): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/workflows/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    updateFolder: async (id: string, data: { name?: string; description?: string; parentId?: string }): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/workflows/folders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    deleteFolder: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/workflows/folders/${id}`, { method: 'DELETE' });
        if (!response.ok) {
            const error = await response.json();
            throw error;
        }
    }
};
