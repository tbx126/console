import { get, send } from './api';

const travelApi = {
  getFlights: () => get('/travel/flights'),
  getFlight: (id) => get(`/travel/flights/${id}`),
  createFlight: (flight) => send('post', '/travel/flights', flight),
  updateFlight: (id, flight) => send('put', `/travel/flights/${id}`, flight),
  deleteFlight: (id) => send('delete', `/travel/flights/${id}`),
  getAirlineStats: () => get('/travel/airlines'),
  getAchievements: () => get('/travel/achievements'),
  getStatistics: () => get('/travel/statistics'),
  getMapData: () => get('/travel/map-data'),
  // 后端已缓存查询结果；前端只缓存同一会话内的重复查询
  lookupFlight: (flightNumber, date) =>
    get('/travel/lookup', { params: { flight_number: flightNumber, date }, ttl: 10 * 60_000 }),
};

export default travelApi;
