import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const settingsApi = {
    getSettings: async () => {
        const response = await axios.get(`${API_URL}/settings`);
        return response.data;
    },
    updateSetting: async (key: string, value: string) => {
        const response = await axios.patch(`${API_URL}/settings/${key}`, { value });
        return response.data;
    },
};
