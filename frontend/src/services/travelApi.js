import apiClient from './api';

const travelApi = {
  // Flights
  getFlights: async () => {
    const response = await apiClient.get('/travel/flights');
    return response.data;
  },

  getFlight: async (id) => {
    const response = await apiClient.get(`/travel/flights/${id}`);
    return response.data;
  },

  createFlight: async (flight) => {
    const response = await apiClient.post('/travel/flights', flight);
    return response.data;
  },

  updateFlight: async (id, flight) => {
    const response = await apiClient.put(`/travel/flights/${id}`, flight);
    return response.data;
  },

  deleteFlight: async (id) => {
    const response = await apiClient.delete(`/travel/flights/${id}`);
    return response.data;
  },

  // Airline statistics
  getAirlineStats: async () => {
    const response = await apiClient.get('/travel/airlines');
    return response.data;
  },

  // Achievements
  getAchievements: async () => {
    const response = await apiClient.get('/travel/achievements');
    return response.data;
  },

  // Statistics
  getStatistics: async () => {
    const response = await apiClient.get('/travel/statistics');
    return response.data;
  },

  // Flight lookup
  lookupFlight: async (flightNumber, date) => {
    const response = await apiClient.get('/travel/lookup', {
      params: { flight_number: flightNumber, date }
    });
    return response.data;
  },
};

export default travelApi;
