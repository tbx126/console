import { useState, useEffect } from 'react';
import {
  Save, Check, Eye, EyeOff, ChevronDown, ChevronRight,
  TrendingUp, Plane, Map, Gamepad2, Star, CheckCircle2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import toast from 'react-hot-toast';

// API 配置分组
const API_GROUPS = [
  {
    id: 'investment',
    label: '投资 API',
    icon: TrendingUp,
    description: '股票、加密货币、汇率数据',
    fields: [
      { key: 'alpha_vantage_key', label: 'Alpha Vantage', placeholder: 'Your Alpha Vantage API key', hasKey: 'has_alpha_vantage', recommended: true },
      { key: 'coingecko_key', label: 'CoinGecko', placeholder: 'Your CoinGecko API key', hasKey: 'has_coingecko' },
      { key: 'exchange_rate_key', label: 'Exchange Rate', placeholder: 'Your Exchange Rate API key', hasKey: 'has_exchange_rate' }
    ]
  },
  {
    id: 'flight',
    label: '航班 API',
    icon: Plane,
    description: '航班追踪和信息查询',
    fields: [
      { key: 'aviationstack_key', label: 'AviationStack', placeholder: 'Your AviationStack API key', hasKey: 'has_aviationstack', recommended: true },
      { key: 'aerodatabox_key', label: 'AeroDataBox', placeholder: 'Your AeroDataBox API key', hasKey: 'has_aerodatabox' },
      { key: 'airlabs_key', label: 'AirLabs', placeholder: 'Your AirLabs API key', hasKey: 'has_airlabs' },
      { key: 'opensky_username', label: 'OpenSky Username', placeholder: 'OpenSky username', hasKey: 'has_opensky' },
      { key: 'opensky_password', label: 'OpenSky Password', placeholder: 'OpenSky password', type: 'password' }
    ]
  },
  {
    id: 'maps',
    label: '地图 API',
    icon: Map,
    description: '地图显示和地理编码',
    fields: [
      { key: 'google_maps_key', label: 'Google Maps', placeholder: 'Your Google Maps API key', hasKey: 'has_google_maps', recommended: true }
    ]
  },
  {
    id: 'gaming',
    label: '游戏 API',
    icon: Gamepad2,
    description: 'Steam 游戏库同步',
    fields: [
      { key: 'steam_api_key', label: 'Steam API Key', placeholder: 'Your Steam Web API key', hasKey: 'has_steam', recommended: true },
      { key: 'steam_id', label: 'Steam ID', placeholder: 'Your Steam ID (17 digits)', type: 'text' }
    ]
  }
];

// API 分组卡片组件
const APIGroupCard = ({ group, apiKeys, formData, showPasswords, onInputChange, onTogglePassword }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = group.icon;

  // 计算已配置数量
  const configuredCount = group.fields.filter(
    field => field.hasKey && apiKeys[field.hasKey]
  ).length;
  const totalCount = group.fields.filter(f => f.hasKey).length;

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      {/* 卡片头部 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {group.label}
            </span>
            {configuredCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                {configuredCount}/{totalCount}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {group.description}
          </p>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-zinc-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-zinc-400" />
        )}
      </button>

      {/* 卡片内容 */}
      {isExpanded && (
        <div className="px-4 py-4 space-y-4 bg-white dark:bg-zinc-900">
          {group.fields.map((field) => (
            <APIField
              key={field.key}
              field={field}
              hasKey={field.hasKey ? apiKeys[field.hasKey] : false}
              value={formData[field.key] || ''}
              showPassword={showPasswords[field.key]}
              onChange={(value) => onInputChange(field.key, value)}
              onTogglePassword={() => onTogglePassword(field.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 单个 API 字段组件
const APIField = ({ field, hasKey, value, showPassword, onChange, onTogglePassword }) => {
  const isPassword = field.type === 'password' || field.key.includes('key');
  const inputType = isPassword && !showPassword ? 'password' : 'text';

  return (
    <div className={`p-3 rounded-lg border transition-colors ${
      hasKey && !value
        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
        : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30'
    }`}>
      {/* 标签行 */}
      <div className="flex items-center gap-2 mb-2">
        <Label className="text-sm font-medium">{field.label}</Label>
        {field.recommended && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            <Star className="h-3 w-3" />
            推荐
          </span>
        )}
        {hasKey && !value && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            <Check className="h-3 w-3" />
            已配置
          </span>
        )}
      </div>

      {/* 输入框 */}
      <div className="relative">
        <Input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hasKey && !value ? '••••••••（已保存）' : field.placeholder}
          className="pr-10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

const APISettingsTab = () => {
  const [apiKeys, setApiKeys] = useState({});
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/config/api-keys');
      const data = await response.json();
      setApiKeys(data);
    } catch (error) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/config/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('API keys saved');
        setFormData({});
        loadApiKeys();
      } else {
        toast.error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordVisibility = (key) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {API_GROUPS.map((group) => (
        <APIGroupCard
          key={group.id}
          group={group}
          apiKeys={apiKeys}
          formData={formData}
          showPasswords={showPasswords}
          onInputChange={handleInputChange}
          onTogglePassword={togglePasswordVisibility}
        />
      ))}

      {/* Save Button */}
      {Object.keys(formData).length > 0 && (
        <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default APISettingsTab;
