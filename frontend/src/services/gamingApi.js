import { get, send } from './api';

const LONG = 10 * 60_000;

const gamingApi = {
  getGames: () => get('/gaming/games', { ttl: LONG }),
  getGame: (appid) => get(`/gaming/games/${appid}`, { ttl: LONG }),
  getGameDetails: (appid) => get(`/gaming/games/${appid}/details`, { ttl: LONG }),
  getGameAchievements: (appid) => get(`/gaming/games/${appid}/achievements`, { ttl: LONG }),
  getDetailedAchievements: (appid) => get(`/gaming/games/${appid}/achievements-detailed`, { ttl: LONG }),
  getGameNews: (appid, count = 10) => get(`/gaming/games/${appid}/news`, { params: { count }, ttl: LONG }),
  getStatistics: () => get('/gaming/statistics', { ttl: LONG }),
  syncGames: () => send('post', '/gaming/sync'),
  getCacheSyncStatus: () => get('/gaming/cache/sync-status', { ttl: 0, force: true }),
};

export default gamingApi;
