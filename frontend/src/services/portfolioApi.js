import apiClient, { cachedGet } from './api';

const portfolioApi = {
  // Investments
  getInvestments: async () => {
    const response = await cachedGet('/portfolio/investments');
    return response.data;
  },

  getInvestment: async (id) => {
    const response = await cachedGet(`/portfolio/investments/${id}`);
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

  // Experience
  getExperiences: async () => {
    const response = await cachedGet('/portfolio/experience');
    return response.data;
  },

  createExperience: async (experience) => {
    const response = await apiClient.post('/portfolio/experience', experience);
    return response.data;
  },

  updateExperience: async (id, experience) => {
    const response = await apiClient.put(`/portfolio/experience/${id}`, experience);
    return response.data;
  },

  deleteExperience: async (id) => {
    const response = await apiClient.delete(`/portfolio/experience/${id}`);
    return response.data;
  },

  // Statistics
  getStatistics: async () => {
    const response = await cachedGet('/portfolio/statistics');
    return response.data;
  },

  // Prices
  getPrice: async (symbol, assetType = 'stock') => {
    const response = await cachedGet(`/portfolio/prices/${symbol}`, {
      params: { asset_type: assetType }
    });
    return response.data;
  },

  refreshAllPrices: async () => {
    const response = await apiClient.post('/portfolio/investments/refresh-all-prices');
    return response.data;
  },

  refreshInvestmentPrice: async (investmentId) => {
    const response = await apiClient.post(`/portfolio/investments/${investmentId}/refresh-price`);
    return response.data;
  },
};

export default portfolioApi;
