import axios from 'axios';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getCache = new Map();
const inFlightGets = new Map();
const DEFAULT_GET_TTL_MS = 10_000;
const MAX_GET_CACHE_ENTRIES = 100;
let cacheGeneration = 0;

const cacheKey = (url, config = {}) => {
  const params = Object.entries(config.params || {}).sort(([a], [b]) => a.localeCompare(b));
  return `${url}:${JSON.stringify(params)}`;
};

export const clearGetCache = () => {
  cacheGeneration += 1;
  getCache.clear();
  inFlightGets.clear();
};

export const cachedGet = async (url, config = {}, ttlMs = DEFAULT_GET_TTL_MS) => {
  const key = cacheKey(url, config);
  const cached = getCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.response;
  }

  const pending = inFlightGets.get(key);
  if (pending) return pending;

  const requestGeneration = cacheGeneration;
  const request = apiClient.get(url, config).then((response) => {
    if (ttlMs > 0 && requestGeneration === cacheGeneration) {
      getCache.set(key, { response, expiresAt: Date.now() + ttlMs });
      if (getCache.size > MAX_GET_CACHE_ENTRIES) {
        getCache.delete(getCache.keys().next().value);
      }
    }
    return response;
  }).finally(() => {
    if (inFlightGets.get(key) === request) {
      inFlightGets.delete(key);
    }
  });

  inFlightGets.set(key, request);
  return request;
};

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    if ((config.method || 'get').toLowerCase() !== 'get') {
      clearGetCache();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
