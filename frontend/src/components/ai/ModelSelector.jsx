import { useState } from 'react';
import { ChevronDown, Check, Cpu, Settings, Eye, Brain, Plug, Zap, MessageSquare } from 'lucide-react';

// 能力图标映射
const CAPABILITY_ICONS = {
  supports_vision: { icon: Eye, label: '视觉' },
  supports_reasoning: { icon: Brain, label: '推理' },
  supports_mcp: { icon: Plug, label: 'MCP' },
  supports_skills: { icon: Zap, label: 'Skills' },
  supports_streaming: { icon: MessageSquare, label: '流式' }
};

const ModelSelector = ({ configs, currentConfig, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeConfig = configs.find(c => c.is_default) || configs[0];

  const handleSelectConfig = (configId) => {
    onSelect(configId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-xl text-sm transition-colors"
      >
        <Cpu className="h-4 w-4 text-violet-600" />
        <span className="text-zinc-700 dark:text-zinc-200 font-medium">
          {activeConfig?.name || 'Select Model'}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {currentConfig?.model}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200 max-h-96 overflow-y-auto">
            <div className="px-3 py-1.5 text-xs text-zinc-500 uppercase tracking-wider">
              Configurations
            </div>
            {configs.length === 0 ? (
              <div className="px-3 py-4 text-sm text-zinc-500 text-center">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No saved configs</p>
                <p className="text-xs mt-1">Add one in Settings</p>
              </div>
            ) : (
              configs.map((config) => (
                <ConfigItem
                  key={config.id}
                  config={config}
                  onSelect={() => handleSelectConfig(config.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

// 配置项组件
const ConfigItem = ({ config, onSelect }) => {
  // 获取启用的能力
  const enabledCapabilities = Object.entries(CAPABILITY_ICONS)
    .filter(([key]) => config[key])
    .map(([key, value]) => ({ key, ...value }));

  return (
    <button
      onClick={onSelect}
      className={`w-full px-3 py-2.5 text-left transition-colors ${
        config.is_default ? 'bg-violet-50 dark:bg-violet-900/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          config.is_default ? 'bg-violet-100 dark:bg-violet-800' : 'bg-zinc-100 dark:bg-zinc-600'
        }`}>
          <Cpu className={`h-4 w-4 ${config.is_default ? 'text-violet-600' : 'text-zinc-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {config.name}
            </span>
            {config.is_default && (
              <Check className="h-4 w-4 text-violet-600 flex-shrink-0" />
            )}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {config.model}
          </div>
        </div>
      </div>
      {/* Capability Tags */}
      {enabledCapabilities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 ml-11">
          {enabledCapabilities.map(({ key, icon: Icon, label }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
            >
              <Icon className="h-3 w-3" />
              {label}
            </span>
          ))}
        </div>
      )}
    </button>
  );
};

export default ModelSelector;
