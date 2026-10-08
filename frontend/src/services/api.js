import axios from 'axios';
import { fetchQuery, invalidate, useQuery } from '../lib/query';

const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  },
);

const keyOf = (url, params) => {
  const query = new URLSearchParams(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null).sort(([a], [b]) => a.localeCompare(b)),
  ).toString();
  return query ? `${url}?${query}` : url;
};

/** 模块前缀，如 "/travel/flights/1" → "/travel" */
const moduleOf = (url) => `/${url.split('/').filter(Boolean)[0] || ''}`;

/** 带缓存的 GET，返回响应数据。 */
export function get(url, { params, ttl = 30_000, force = false } = {}) {
  return fetchQuery(keyOf(url, params), () => apiClient.get(url, { params }).then((r) => r.data), { ttl, force });
}

/** 组件内读取接口数据并在相关写操作后自动刷新。url 为 null 时不请求。 */
export function useApi(url, { params, ttl = 30_000 } = {}) {
  const key = url ? keyOf(url, params) : null;
  return useQuery(key, () => apiClient.get(url, { params }).then((r) => r.data), { ttl });
}

/** 写操作：成功后让该模块（以及依赖它的总览、里程碑）的缓存失效。 */
export async function send(method, url, data, config) {
  const response = await apiClient.request({ method, url, data, ...config });
  invalidate(moduleOf(url));
  invalidate('/milestones');
  return response.data;
}

export default apiClient;
