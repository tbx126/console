import apiClient from './api';

const aiApi = {
  // 流式发送聊天消息
  sendMessageStream: async (message, history = [], onChunk, params = {}) => {
    const response = await fetch('/api/ai/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history,
        temperature: params.temperature,
        top_p: params.top_p,
        max_tokens: params.max_tokens,
        system_prompt: params.system_prompt
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = ''; // 缓冲区处理跨 chunk 的数据

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // 保留最后一个可能不完整的行
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            return fullContent; // 直接返回，退出整个函数
          }
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              onChunk(fullContent);
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // 忽略 JSON 解析错误（可能是不完整的数据）
            if (e.name !== 'SyntaxError') {
              console.error('Stream parse error:', e);
            }
          }
        }
      }
    }

    return fullContent;
  },

  // 发送带图片的消息
  sendVisionMessage: async (message, imageBase64, history = [], params = {}) => {
    const response = await apiClient.post('/ai/chat/vision', {
      message,
      image_base64: imageBase64,
      history,
      temperature: params.temperature,
      top_p: params.top_p,
      max_tokens: params.max_tokens,
      system_prompt: params.system_prompt
    });
    return response.data;
  },

  // ============ 多配置管理 ============
  getConfigs: async () => {
    const response = await apiClient.get('/ai/configs');
    return response.data;
  },

  createConfigProfile: async (config) => {
    const response = await apiClient.post('/ai/configs', config);
    return response.data;
  },

  updateConfigProfile: async (configId, config) => {
    const response = await apiClient.put(`/ai/configs/${configId}`, config);
    return response.data;
  },

  deleteConfigProfile: async (configId) => {
    const response = await apiClient.delete(`/ai/configs/${configId}`);
    return response.data;
  },

  activateConfig: async (configId) => {
    const response = await apiClient.post(`/ai/configs/${configId}/activate`);
    return response.data;
  },

  // ============ 对话管理 ============
  getConversations: async () => {
    const response = await apiClient.get('/ai/conversations');
    return response.data;
  },

  createConversation: async (conversation) => {
    const response = await apiClient.post('/ai/conversations', conversation);
    return response.data;
  },

  getConversation: async (convId) => {
    const response = await apiClient.get(`/ai/conversations/${convId}`);
    return response.data;
  },

  updateConversation: async (convId, conversation) => {
    const response = await apiClient.put(`/ai/conversations/${convId}`, conversation);
    return response.data;
  },

  deleteConversation: async (convId) => {
    const response = await apiClient.delete(`/ai/conversations/${convId}`);
    return response.data;
  },

  generateTitle: async (convId) => {
    const response = await apiClient.post(`/ai/conversations/${convId}/generate-title`);
    return response.data;
  },

  parseText: async (text) => {
    const response = await apiClient.post('/ai/parse', { text });
    return response.data;
  },

  submitParsedData: async (dataType, data) => {
    const response = await apiClient.post('/ai/submit', { data_type: dataType, data });
    return response.data;
  }
};

export default aiApi;
