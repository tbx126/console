import { useState, useEffect } from 'react';
import { Settings2, RotateCcw } from 'lucide-react';

const ParameterPanel = ({ params, onChange, isOpen, defaultSystemPrompt }) => {
  const [localParams, setLocalParams] = useState(params);

  // Sync with parent params when they change
  useEffect(() => {
    setLocalParams(params);
  }, [params]);

  const handleChange = (key, value) => {
    const newParams = { ...localParams, [key]: value };
    setLocalParams(newParams);
    onChange(newParams);
  };

  const handleReset = () => {
    const resetParams = {
      temperature: 0.7,
      top_p: 1.0,
      max_tokens: 8192,
      system_prompt: defaultSystemPrompt || ''
    };
    setLocalParams(resetParams);
    onChange(resetParams);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-72 bg-white dark:bg-zinc-800 border-l border-zinc-200 dark:border-zinc-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-violet-600" />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">Parameters</span>
        </div>
        <button
          onClick={handleReset}
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw className="h-4 w-4 text-zinc-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col">
        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Temperature
            </label>
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
              {localParams.temperature.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={localParams.temperature}
            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Controls randomness. Lower = more focused, higher = more creative.
          </p>
        </div>

        {/* Top P */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Top P
            </label>
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
              {localParams.top_p.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={localParams.top_p}
            onChange={(e) => handleChange('top_p', parseFloat(e.target.value))}
            className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Nucleus sampling. Lower = more focused on likely tokens.
          </p>
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Max Tokens
            </label>
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
              {localParams.max_tokens}
            </span>
          </div>
          <input
            type="range"
            min="256"
            max="32768"
            step="256"
            value={localParams.max_tokens}
            onChange={(e) => handleChange('max_tokens', parseInt(e.target.value))}
            className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Maximum length of the response.
          </p>
        </div>

        {/* System Prompt */}
        <div className="space-y-2 flex-1 flex flex-col min-h-0">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            System Prompt
          </label>
          <textarea
            value={localParams.system_prompt}
            onChange={(e) => handleChange('system_prompt', e.target.value)}
            placeholder="Enter custom instructions for the AI..."
            className="flex-1 min-h-[200px] px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Custom instructions that define the AI's behavior and personality.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ParameterPanel;
