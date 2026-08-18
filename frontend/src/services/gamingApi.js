import api, { cachedGet } from './api';

const gamingApi = {
  getGames: () => cachedGet('/gaming/games'),
  getGame: (appid) => cachedGet(`/gaming/games/${appid}`),
  getGameDetails: (appid) => cachedGet(`/gaming/games/${appid}/details`),
  getGameAchievements: (appid) => cachedGet(`/gaming/games/${appid}/achievements`),
  getDetailedAchievements: (appid) => cachedGet(`/gaming/games/${appid}/achievements-detailed`),
  getGameNews: (appid, count = 10) => cachedGet(`/gaming/games/${appid}/news`, { params: { count } }),
  getStatistics: () => cachedGet('/gaming/statistics'),
  syncGames: () => api.post('/gaming/sync'),
  getCacheSyncStatus: () => api.get('/gaming/cache/sync-status'),
};

export default gamingApi;
