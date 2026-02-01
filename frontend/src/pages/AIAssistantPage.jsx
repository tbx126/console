import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Trash2, Plus, Image, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight } from 'lucide-react';
import { ChatInterface } from '../components/ai/ChatInterface';
import { Button } from '../components/ui/Button';
import ConversationSidebar from '../components/ai/ConversationSidebar';
import ModelSelector from '../components/ai/ModelSelector';
import DataConfirmModal from '../components/ai/DataConfirmModal';
import ParameterPanel from '../components/ai/ParameterPanel';
import aiApi from '../services/aiApi';
import toast from 'react-hot-toast';

const DEFAULT_SYSTEM_PROMPT = `你是一个友好的 AI 助手，可以和用户自然地聊天。

格式要求：
- 使用 Markdown 格式回复
- 数学公式使用 LaTeX 语法：行内公式用 $...$ 或 \\(...\\)，块级公式用 $$...$$ 或 \\[...\\]
- 不要用反引号 \` 包裹数学公式，必须用 $ 符号
- 代码块使用 \`\`\`language 格式

当用户在对话中提到可以记录的信息时（如消费、收入、航班、投资等），请在回复末尾附上 JSON 数据，格式如下：

支持的类型：
- expense: {"data_type": "expense", "data": {"category": "分类", "amount": 金额, "merchant": "商家", "date": "YYYY-MM-DD", "notes": "备注"}}
- income: {"data_type": "income", "data": {"source": "来源", "amount": 金额, "date": "YYYY-MM-DD", "type": "类型"}}
- flight: {"data_type": "flight", "data": {"airline": "航空公司", "flight_number": "航班号", "origin": "出发地", "destination": "目的地", "date": "YYYY-MM-DD", "travel_class": "舱位"}}
- investment: {"data_type": "investment", "data": {"symbol": "代码", "quantity": 数量, "purchase_price": 价格, "date": "YYYY-MM-DD"}}

注意：
- 只有当用户明确提到具体的消费、收入、航班或投资信息时才附加 JSON
- 普通聊天不需要附加任何 JSON
- 先用自然语言回复，JSON 放在最后`;

const DEFAULT_PARAMS = {
  temperature: 0.7,
  top_p: 1.0,
  max_tokens: 8192,
  system_prompt: DEFAULT_SYSTEM_PROMPT
};

const AIAssistantPage = () => {
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Config state
  const [configs, setConfigs] = useState([]);
  const [currentConfig, setCurrentConfig] = useState(null);

  // Image upload state
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);

  // Data confirm modal state
  const [showDataModal, setShowDataModal] = useState(false);
  const [pendingData, setPendingData] = useState(null);

  // Parameter panel state
  const [paramPanelOpen, setParamPanelOpen] = useState(true);
  const [chatParams, setChatParams] = useState(DEFAULT_PARAMS);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [configsData, convsData] = await Promise.all([
        aiApi.getConfigs(),
        aiApi.getConversations()
      ]);
      setConfigs(configsData);
      // Set current config to the default one
      const defaultConfig = configsData.find(c => c.is_default) || configsData[0];
      setCurrentConfig(defaultConfig);
      setConversations(convsData);

      // Load last conversation or create new
      if (convsData.length > 0) {
        const lastConv = convsData[0];
        setCurrentConvId(lastConv.id);
        setMessages(lastConv.messages || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleSelectConversation = async (convId) => {
    // Save current conversation first
    if (currentConvId && messages.length > 0) {
      await saveCurrentConversation();
    }

    setCurrentConvId(convId);

    // Fetch latest conversation from backend
    try {
      const conv = await aiApi.getConversation(convId);
      setMessages(conv?.messages || []);
    } catch (error) {
      const localConv = conversations.find(c => c.id === convId);
      setMessages(localConv?.messages || []);
    }
  };

  const handleCreateConversation = async () => {
    // Save current first
    if (currentConvId && messages.length > 0) {
      await saveCurrentConversation();
    }

    try {
      const newConv = await aiApi.createConversation({
        title: 'New Conversation',
        messages: []
      });
      setConversations(prev => [newConv, ...prev]);
      setCurrentConvId(newConv.id);
      setMessages([]);
    } catch (error) {
      toast.error('Failed to create conversation');
    }
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await aiApi.deleteConversation(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));

      if (currentConvId === convId) {
        const remaining = conversations.filter(c => c.id !== convId);
        if (remaining.length > 0) {
          setCurrentConvId(remaining[0].id);
          setMessages(remaining[0].messages || []);
        } else {
          // 如果没有剩余对话，自动创建一个新对话
          const newConv = await aiApi.createConversation({
            title: 'New Conversation',
            messages: []
          });
          setConversations([newConv]);
          setCurrentConvId(newConv.id);
          setMessages([]);
        }
      }
    } catch (error) {
      toast.error('Failed to delete conversation');
    }
  };

  const saveCurrentConversation = async () => {
    if (!currentConvId) return;

    const conv = conversations.find(c => c.id === currentConvId);
    if (conv) {
      const title = messages[0]?.content?.slice(0, 30) || 'New Conversation';
      await aiApi.updateConversation(currentConvId, {
        ...conv,
        title,
        messages
      });
      setConversations(prev =>
        prev.map(c => c.id === currentConvId ? { ...c, title, messages } : c)
      );
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
      hasImage: !!selectedImage
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    const currentImage = selectedImage;
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // 添加空的助手消息用于流式更新
    const assistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    setMessages([...newMessages, assistantMessage]);

    try {
      let fullContent;

      if (currentImage) {
        // Vision 模式：发送图片
        const imageBase64 = await fileToBase64(currentImage);
        const response = await aiApi.sendVisionMessage(
          inputMessage || 'What is in this image?',
          imageBase64,
          messages,
          chatParams
        );
        fullContent = response.message;
        setMessages([...newMessages, { ...assistantMessage, content: fullContent }]);
      } else {
        // 流式模式：普通文本
        fullContent = await aiApi.sendMessageStream(
          inputMessage,
          messages,
          (content) => {
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content
              };
              return updated;
            });
          },
          chatParams
        );
      }

      // Auto-save conversation with final messages
      if (currentConvId) {
        const finalMessages = [...newMessages, { ...assistantMessage, content: fullContent }];
        await aiApi.updateConversation(currentConvId, {
          messages: finalMessages
        });

        // Auto-generate title after first exchange (2 messages: user + assistant)
        if (finalMessages.length === 2) {
          try {
            const { title } = await aiApi.generateTitle(currentConvId);
            setConversations(prev =>
              prev.map(c => c.id === currentConvId
                ? { ...c, title, messages: finalMessages }
                : c
              )
            );
          } catch (e) {
            console.error('Failed to generate title:', e);
            setConversations(prev =>
              prev.map(c => c.id === currentConvId
                ? { ...c, messages: finalMessages }
                : c
              )
            );
          }
        } else {
          setConversations(prev =>
            prev.map(c => c.id === currentConvId
              ? { ...c, messages: finalMessages }
              : c
            )
          );
        }
      }

      // Parse response for recordable data
      try {
        const parseResult = await aiApi.parseText(fullContent);
        if (parseResult.parsed && parseResult.data) {
          setPendingData(parseResult.data);
          setShowDataModal(true);
        }
      } catch (e) {
        console.error('Failed to parse response:', e);
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    setMessages([]);
    if (currentConvId) {
      aiApi.updateConversation(currentConvId, { title: 'New Conversation', messages: [] });
    }
    toast.success('Chat cleared');
  };

  const handleSelectConfig = async (configId) => {
    try {
      await aiApi.activateConfig(configId);
      const newConfigs = configs.map(c => ({ ...c, is_default: c.id === configId }));
      setConfigs(newConfigs);
      setCurrentConfig(newConfigs.find(c => c.id === configId));
      toast.success('Model switched');
    } catch (error) {
      toast.error('Failed to switch model');
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      toast.success('Image attached');
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleConfirmData = async () => {
    if (!pendingData) return;
    try {
      const result = await aiApi.submitParsedData(pendingData.data_type, pendingData.data);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error('记录失败');
    }
    setShowDataModal(false);
    setPendingData(null);
  };

  const handleCancelData = () => {
    setShowDataModal(false);
    setPendingData(null);
  };

  const handleRegenerate = useCallback(async () => {
    if (messages.length < 2 || isLoading) return;

    // 移除最后一条 AI 消息
    const newMessages = messages.slice(0, -1);
    setMessages(newMessages);
    setIsLoading(true);

    // 获取最后一条用户消息
    const lastUserMessage = newMessages[newMessages.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      setIsLoading(false);
      return;
    }

    // 添加空的助手消息用于流式更新
    const assistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    setMessages([...newMessages, assistantMessage]);

    try {
      const fullContent = await aiApi.sendMessageStream(
        lastUserMessage.content,
        newMessages.slice(0, -1), // 不包含最后一条用户消息
        (content) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content
            };
            return updated;
          });
        },
        chatParams
      );

      // 保存对话
      if (currentConvId) {
        const finalMessages = [...newMessages, { ...assistantMessage, content: fullContent }];
        await aiApi.updateConversation(currentConvId, { messages: finalMessages });
        setConversations(prev =>
          prev.map(c => c.id === currentConvId ? { ...c, messages: finalMessages } : c)
        );
      }
    } catch (error) {
      toast.error('Failed to regenerate');
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, currentConvId, chatParams]);

  const handleEditMessage = useCallback((content) => {
    setInputMessage(content);
  }, []);

  return (
    <div className="h-[calc(100vh-4rem)] flex relative">
      {/* Sidebar */}
      {sidebarOpen && (
        <ConversationSidebar
          conversations={conversations}
          currentId={currentConvId}
          onSelect={handleSelectConversation}
          onCreate={handleCreateConversation}
          onDelete={handleDeleteConversation}
        />
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        {/* Top Toolbar */}
        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                title={sidebarOpen ? 'Hide conversations' : 'Show conversations'}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                ) : (
                  <PanelLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                )}
              </button>
              <ModelSelector
                configs={configs}
                currentConfig={currentConfig}
                onSelect={handleSelectConfig}
              />
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleCreateConversation} className="rounded-xl">
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                disabled={messages.length === 0}
                className="rounded-xl"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setParamPanelOpen(!paramPanelOpen)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                title={paramPanelOpen ? 'Hide parameters' : 'Show parameters'}
              >
                {paramPanelOpen ? (
                  <PanelRightClose className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                ) : (
                  <PanelRight className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
        />

        {/* Input Area */}
        <div className="bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 p-4 shadow-lg">
          <div className="container mx-auto max-w-3xl">
            {/* Image Preview */}
            {selectedImage && (
              <div className="mb-3 flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                <img
                  src={URL.createObjectURL(selectedImage)}
                  alt="Preview"
                  className="h-14 w-14 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-700 truncate">
                    {selectedImage.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {(selectedImage.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  onClick={handleRemoveImage}
                  className="p-2 hover:bg-violet-100 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-violet-600" />
                </button>
              </div>
            )}
            <div className="flex gap-3 items-start">
              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder={selectedImage ? "Describe what you want to know..." : "Message AI Assistant..."}
                  className="w-full px-4 py-3 pr-12 border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  rows={1}
                  style={{ minHeight: '52px', maxHeight: '120px' }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {currentConfig?.supports_vision && (
                  <button
                    onClick={handleImageClick}
                    className={`absolute right-3 bottom-3.5 p-1 rounded-lg transition-all ${
                      selectedImage
                        ? 'text-violet-600 bg-violet-100'
                        : 'text-zinc-400 hover:text-violet-600 hover:bg-violet-50'
                    }`}
                    title="Upload image"
                  >
                    <Image className="h-5 w-5" />
                  </button>
                )}
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
                className="h-[52px] w-[52px] rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-200"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Confirm Modal */}
      <DataConfirmModal
        isOpen={showDataModal}
        data={pendingData}
        onConfirm={handleConfirmData}
        onCancel={handleCancelData}
      />

      {/* Parameter Panel */}
      <ParameterPanel
        params={chatParams}
        onChange={setChatParams}
        isOpen={paramPanelOpen}
        defaultSystemPrompt={DEFAULT_SYSTEM_PROMPT}
      />
    </div>
  );
};

export default AIAssistantPage;
