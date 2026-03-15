const API_BASE_URL = '/api';

async function handleResponse(response: Response) {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    }
    return response.json();
}

export const schedulingApi = {
    getCalendars: async (): Promise<any[]> => {
        const response = await fetch(`${API_BASE_URL}/calendars`);
        return handleResponse(response);
    },
    getSchedules: async (): Promise<any[]> => {
        const response = await fetch(`${API_BASE_URL}/schedules`);
        return handleResponse(response);
    },
    getSchedule: async (id: string): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/schedules/${id}`);
        return handleResponse(response);
    },
    getCalendar: async (id: string): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/calendars/${id}`);
        return handleResponse(response);
    },
    getScheduleUsage: async (id: string): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/schedules/${id}/usage`);
        return handleResponse(response);
    },
    getCalendarUsage: async (id: string): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/calendars/${id}/usage`);
        return handleResponse(response);
    },
    deleteSchedule: async (id: string): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/schedules/${id}`, { method: 'DELETE' });
        return handleResponse(response);
    },
    deleteCalendar: async (id: string): Promise<any> => {
        const response = await fetch(`${API_BASE_URL}/calendars/${id}`, { method: 'DELETE' });
        return handleResponse(response);
    }
};
