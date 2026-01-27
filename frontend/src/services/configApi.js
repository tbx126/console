import apiClient from './api';

const configApi = {
  getApiKeys: async () => {
    const response = await apiClient.get('/config/api-keys');
    return response.data;
  },

  updateApiKeys: async (keys) => {
    const response = await apiClient.put('/config/api-keys', keys);
    return response.data;
  },

  deleteApiKey: async (keyName) => {
    const response = await apiClient.delete(`/config/api-keys/${keyName}`);
    return response.data;
  }
};

export default configApi;
