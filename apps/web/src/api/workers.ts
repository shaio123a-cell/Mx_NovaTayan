import { Worker } from '@restmon/shared-types';

const API_BASE_URL = '/api';

async function handleResponse(response: Response) {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    }
    return response.json();
}

export const workersApi = {
    getWorkers: async (): Promise<Worker[]> => {
        const response = await fetch(`${API_BASE_URL}/worker/list`);
        return handleResponse(response);
    },

    updateWorker: async (id: string, data: Partial<Worker>): Promise<Worker> => {
        const response = await fetch(`${API_BASE_URL}/worker/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },
};
