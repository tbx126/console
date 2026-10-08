import apiClient from './api';
import { invalidate } from '../lib/query';

// 恢复与导入会替换任意模块的数据：之后让所有前端缓存失效。
const afterRestore = (data) => {
  invalidate();
  return data;
};

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
    return afterRestore(response.data);
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
    return afterRestore(response.data);
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
    return afterRestore(response.data);
  },
};

export default dataApi;
