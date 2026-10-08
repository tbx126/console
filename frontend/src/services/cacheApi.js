import { get, send } from './api';
import { clearQueries } from '../lib/query';

const cacheApi = {
  overview: () => get('/cache', { ttl: 0, force: true }),
  clear: (name) => send('delete', name ? `/cache/${name}` : '/cache'),
  clearBrowser: () => clearQueries(),
};

export default cacheApi;
