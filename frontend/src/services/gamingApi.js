import api from './api';

const gamingApi = {
  getGames: () => api.get('/gaming/games'),
  getGame: (appid) => api.get(`/gaming/games/${appid}`),
  getGameDetails: (appid) => api.get(`/gaming/games/${appid}/details`),
  getGameAchievements: (appid) => api.get(`/gaming/games/${appid}/achievements`),
  getDetailedAchievements: (appid) => api.get(`/gaming/games/${appid}/achievements-detailed`),
  getGameNews: (appid, count = 10) => api.get(`/gaming/games/${appid}/news`, { params: { count } }),
  getStatistics: () => api.get('/gaming/statistics'),
  syncGames: () => api.post('/gaming/sync'),
  getCacheSyncStatus: () => api.get('/gaming/cache/sync-status'),
};

export default gamingApi;
