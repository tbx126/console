import apiClient from './api';

const portfolioApi = {
  // Investments
  getInvestments: async () => {
    const response = await apiClient.get('/portfolio/investments');
    return response.data;
  },

  getInvestment: async (id) => {
    const response = await apiClient.get(`/portfolio/investments/${id}`);
    return response.data;
  },

  createInvestment: async (investment) => {
    const response = await apiClient.post('/portfolio/investments', investment);
    return response.data;
  },

  updateInvestment: async (id, investment) => {
    const response = await apiClient.put(`/portfolio/investments/${id}`, investment);
    return response.data;
  },

  deleteInvestment: async (id) => {
    const response = await apiClient.delete(`/portfolio/investments/${id}`);
    return response.data;
  },

  // Projects
  getProjects: async () => {
    const response = await apiClient.get('/portfolio/projects');
    return response.data;
  },

  createProject: async (project) => {
    const response = await apiClient.post('/portfolio/projects', project);
    return response.data;
  },

  // Experience
  getExperiences: async () => {
    const response = await apiClient.get('/portfolio/experience');
    return response.data;
  },

  createExperience: async (experience) => {
    const response = await apiClient.post('/portfolio/experience', experience);
    return response.data;
  },

  // Statistics
  getStatistics: async () => {
    const response = await apiClient.get('/portfolio/statistics');
    return response.data;
  },

  // Prices
  getPrice: async (symbol, assetType = 'stock') => {
    const response = await apiClient.get(`/portfolio/prices/${symbol}?asset_type=${assetType}`);
    return response.data;
  },

  refreshInvestmentPrice: async (investmentId) => {
    const response = await apiClient.post(`/portfolio/investments/${investmentId}/refresh-price`);
    return response.data;
  },
};

export default portfolioApi;
