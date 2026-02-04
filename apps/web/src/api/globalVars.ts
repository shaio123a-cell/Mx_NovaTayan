import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const globalVarsApi = {
    getAll: async () => {
        const response = await axios.get(`${API_URL}/global-vars`);
        return response.data;
    },
    getGroups: async () => {
        const response = await axios.get(`${API_URL}/global-vars/groups`);
        return response.data;
    },
    createGroup: async (data: any) => {
        const response = await axios.post(`${API_URL}/global-vars/groups`, data);
        return response.data;
    },
    updateGroup: async (name: string, data: any) => {
        const response = await axios.patch(`${API_URL}/global-vars/groups/${name}`, data);
        return response.data;
    },
    deleteGroup: async (name: string) => {
        const response = await axios.delete(`${API_URL}/global-vars/groups/${name}`);
        return response.data;
    },
    create: async (data: any) => {
        const response = await axios.post(`${API_URL}/global-vars`, data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await axios.patch(`${API_URL}/global-vars/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await axios.delete(`${API_URL}/global-vars/${id}`);
        return response.data;
    }
};
