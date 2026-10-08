import { get, send } from './api';

const configApi = {
  getApiKeys: () => get('/config/api-keys', { ttl: 0, force: true }),
  updateApiKeys: (keys) => send('put', '/config/api-keys', keys),
  deleteApiKey: (keyName) => send('delete', `/config/api-keys/${keyName}`),
  getGoogleMapsKey: () => get('/config/google-maps-key', { ttl: 10 * 60_000 }),
};

export default configApi;
