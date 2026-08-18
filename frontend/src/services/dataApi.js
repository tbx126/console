import apiClient from './api';

const dataApi = {
  // Snapshots
  getSnapshotOverview: async () => {
    const response = await apiClient.get('/data/snapshots/overview');
    return response.data;
  },

  getModuleSnapshots: async (module) => {
    const response = await apiClient.get(`/data/snapshots/${module}`);
    return response.data;
  },

  restoreSnapshot: async (backupFilename) => {
    const response = await apiClient.post(`/data/snapshots/${backupFilename}/restore`);
    return response.data;
  },

  deleteSnapshot: async (backupFilename) => {
    const response = await apiClient.delete(`/data/snapshots/${backupFilename}`);
    return response.data;
  },

  deleteOrphanSnapshots: async () => {
    const response = await apiClient.delete('/data/snapshots/orphans');
    return response.data;
  },

  // Archives
  createArchive: async (description = '') => {
    const response = await apiClient.post('/data/archives', { description });
    return response.data;
  },

  listArchives: async () => {
    const response = await apiClient.get('/data/archives');
    return response.data;
  },

  downloadArchive: async (archiveId) => {
    const response = await apiClient.get(`/data/archives/${archiveId}/download`, {
      responseType: 'blob',
    });
    return response;
  },

  restoreArchive: async (archiveId) => {
    const response = await apiClient.post(`/data/archives/${archiveId}/restore`);
    return response.data;
  },

  deleteArchive: async (archiveId) => {
    const response = await apiClient.delete(`/data/archives/${archiveId}`);
    return response.data;
  },

  importArchive: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/data/archives/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default dataApi;
