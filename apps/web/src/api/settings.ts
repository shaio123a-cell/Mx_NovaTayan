const API_URL = '/api/settings';

async function handleResponse(response: Response) {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return response.json();
}

export const settingsApi = {
    getSettings: async () => {
        const response = await fetch(API_URL);
        return handleResponse(response);
    },
    updateSetting: async (key: string, value: string) => {
        const response = await fetch(`${API_URL}/${key}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
        });
        return handleResponse(response);
    },
    getByKey: async (key: string) => {
        const response = await fetch(`${API_URL}/${key}`);
        return handleResponse(response);
    }
};
