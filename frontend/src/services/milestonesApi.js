import { send } from './api';

const milestonesApi = {
  setEmoji: (id, emoji) => send('put', `/milestones/${encodeURIComponent(id)}/emoji`, { emoji }),
};

export default milestonesApi;
