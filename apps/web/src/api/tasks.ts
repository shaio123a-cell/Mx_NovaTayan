import { Task } from '@restmon/shared-types';

const API_BASE_URL = '/api';

async function handleResponse(response: Response) {
    if (!response.ok) {
        const text = await response.text();
        console.error(`API Error (${response.status}):`, text);
        throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    }
    return response.json();
}

export const tasksApi = {
    // Get all tasks
    getTasks: async (): Promise<Task[]> => {
        console.log('Fetching tasks from:', `${API_BASE_URL}/tasks`);
        const response = await fetch(`${API_BASE_URL}/tasks`);
        return handleResponse(response);
    },

    // Get single task
    getTask: async (id: string): Promise<Task> => {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`);
        return handleResponse(response);
    },

    // Create task
    createTask: async (data: {
        name: string;
        description?: string;
        method: string;
        url: string;
        headers?: Record<string, string>;
        body?: string;
        timeout?: number;
        tags?: string[];
    }): Promise<Task> => {
        console.log('Creating task:', data);
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // Update task
    updateTask: async (id: string, data: Partial<Task>): Promise<Task> => {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // Delete task
    deleteTask: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
        }
    },

    // Execute task
    executeTask: async (id: string): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}/execute`, {
            method: 'POST',
        });
        return handleResponse(response);
    },

    // Get task executions
    getTaskExecutions: async (taskId: string): Promise<any[]> => {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/executions`); // Need to add this to backend
        return handleResponse(response);
    },
};
