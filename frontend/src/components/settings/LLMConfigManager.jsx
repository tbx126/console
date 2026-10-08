import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Check, Star, Eye, Brain, Plug, Zap, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import aiApi from '../../services/aiApi';
import { toast } from 'sonner';

const CAPABILITIES = [
  { key: 'supports_vision', label: '视觉', icon: Eye, description: '可处理图片输入' },
  { key: 'supports_reasoning', label: '推理', icon: Brain, description: '支持增强推理模式' },
  { key: 'supports_mcp', label: 'MCP', icon: Plug, description: 'Supports MCP integrations' },
  { key: 'supports_skills', label: '技能', icon: Zap, description: '可调用技能与工具' },
  { key: 'supports_streaming', label: '流式', icon: MessageSquare, description: '支持流式回复' }
];

const ConfigCard = ({ config, onEdit, onDelete, onActivate }) => {
  return (
    <div
      className={`p-4 border rounded-lg ${
        config.is_default
          ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20'
          : 'border-zinc-200 dark:border-zinc-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config.is_default && <Star className="h-4 w-4 text-violet-600 fill-violet-600" />}
          <div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              {config.name}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {config.model}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!config.is_default && (
            <Button variant="ghost" size="sm" onClick={onActivate} title="设为默认" aria-label="设为默认">
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {CAPABILITIES.map((capability) => {
          if (!config[capability.key]) {
            return null;
          }

          const CapabilityIcon = capability.icon;

          return (
            <span
              key={capability.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            >
              <CapabilityIcon className="h-3 w-3" />
              {capability.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const ConfigForm = ({ formData, setFormData, editingId, onSubmit, onCancel }) => {
  return (
    <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg space-y-4">
      <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
        {editingId ? '编辑配置' : '新建配置'}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name *</Label>
          <Input
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            placeholder="我的模型配置"
          />
        </div>
        <div>
          <Label>Model *</Label>
          <Input
            value={formData.model}
            onChange={(event) => setFormData({ ...formData, model: event.target.value })}
            placeholder="gpt-4, deepseek-chat, etc."
          />
        </div>
      </div>

      <div>
        <Label>API Key *</Label>
        <Input
          type="password"
          value={formData.api_key}
          onChange={(event) => setFormData({ ...formData, api_key: event.target.value })}
          placeholder="sk-..."
        />
      </div>

      <div>
        <Label>Base URL (Optional)</Label>
        <Input
          value={formData.base_url}
          onChange={(event) => setFormData({ ...formData, base_url: event.target.value })}
          placeholder="https://api.openai.com/v1"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          留空则使用服务商默认地址
        </p>
      </div>

      <div>
        <Label>能力</Label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          选择该模型支持的能力
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CAPABILITIES.map((capability) => {
            const CapabilityIcon = capability.icon;

            return (
              <label
                key={capability.key}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData[capability.key]
                    ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData[capability.key]}
                  onChange={(event) => setFormData({ ...formData, [capability.key]: event.target.checked })}
                  className="sr-only"
                />
                <CapabilityIcon className={`h-5 w-5 ${formData[capability.key] ? 'text-violet-600' : 'text-zinc-400'}`} />
                <div className="flex-1">
                  <div className={`text-sm font-medium ${formData[capability.key] ? 'text-violet-700 dark:text-violet-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {capability.label}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {capability.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={onSubmit}>
          {editingId ? 'Update' : 'Create'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  );
};

const LLMConfigManager = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    api_key: '',
    model: '',
    base_url: '',
    supports_vision: false,
    supports_reasoning: false,
    supports_mcp: false,
    supports_skills: false,
    supports_streaming: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      api_key: '',
      model: '',
      base_url: '',
      supports_vision: false,
      supports_reasoning: false,
      supports_mcp: false,
      supports_skills: false,
      supports_streaming: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const loadConfigs = async () => {
    try {
      const data = await aiApi.getConfigs();
      setConfigs(data);
    } catch {
      toast.error('配置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfigs();
  }, []);

  const handleSubmit = async () => {
    if (!formData.name || !formData.api_key || !formData.model) {
      toast.error('名称、API 密钥和模型为必填项');
      return;
    }

    try {
      if (editingId) {
        await aiApi.updateConfigProfile(editingId, formData);
        toast.success('配置已更新');
      } else {
        await aiApi.createConfigProfile(formData);
        toast.success('配置已创建');
      }
      await loadConfigs();
      resetForm();
    } catch {
      toast.error('配置保存失败');
    }
  };

  const handleEdit = (config) => {
    setFormData({
      name: config.name,
      api_key: config.api_key,
      model: config.model,
      base_url: config.base_url || '',
      supports_vision: config.supports_vision || false,
      supports_reasoning: config.supports_reasoning || false,
      supports_mcp: config.supports_mcp || false,
      supports_skills: config.supports_skills || false,
      supports_streaming: config.supports_streaming !== false
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this config?')) return;

    try {
      await aiApi.deleteConfigProfile(id);
      toast.success('配置已删除');
      await loadConfigs();
    } catch {
      toast.error('删除失败');
    }
  };

  const handleActivate = async (id) => {
    try {
      await aiApi.activateConfig(id);
      toast.success('已设为默认配置');
      await loadConfigs();
    } catch {
      toast.error('设置默认失败');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {configs.map((config) => (
          <ConfigCard
            key={config.id}
            config={config}
            onEdit={() => handleEdit(config)}
            onDelete={() => handleDelete(config.id)}
            onActivate={() => handleActivate(config.id)}
          />
        ))}

        {configs.length === 0 && !showForm && (
          <div className="text-center py-8 text-zinc-500">
            还没有配置，先添加一个吧。
          </div>
        )}
      </div>

      {showForm ? (
        <ConfigForm
          formData={formData}
          setFormData={setFormData}
          editingId={editingId}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      ) : (
        <Button onClick={() => setShowForm(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          添加配置
        </Button>
      )}
    </div>
  );
};

export default LLMConfigManager;
