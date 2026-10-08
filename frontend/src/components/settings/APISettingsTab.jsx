import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import { useApi } from '../../services/api';
import configApi from '../../services/configApi';

const API_GROUPS = [
  {
    id: 'flight',
    label: '航班',
    fields: [
      { key: 'aviationstack_key', label: 'AviationStack', hasKey: 'has_aviationstack', recommended: true },
      { key: 'aerodatabox_key', label: 'AeroDataBox', hasKey: 'has_aerodatabox' },
      { key: 'airlabs_key', label: 'AirLabs', hasKey: 'has_airlabs' },
      { key: 'opensky_username', label: 'OpenSky 用户名', hasKey: 'has_opensky', plain: true },
      { key: 'opensky_password', label: 'OpenSky 密码' },
    ],
  },
  {
    id: 'maps',
    label: '地图',
    fields: [{ key: 'google_maps_key', label: 'Google Maps', hasKey: 'has_google_maps', recommended: true }],
  },
  {
    id: 'gaming',
    label: '游戏',
    fields: [
      { key: 'steam_api_key', label: 'Steam API Key', hasKey: 'has_steam', recommended: true },
      { key: 'steam_id', label: 'Steam ID', placeholder: '17 位数字', plain: true },
    ],
  },
];

function KeyRow({ field, configured, value, onChange }) {
  const [visible, setVisible] = useState(false);
  const id = `api-${field.key}`;
  return (
    <div className="grid items-center gap-x-3 gap-y-1 border-t border-border px-4 py-2.5 sm:grid-cols-[140px_minmax(0,1fr)_56px]">
      <label htmlFor={id} className="flex items-center gap-1.5">
        {field.label}
        {field.recommended && <span className="rounded bg-muted px-1 text-xs text-muted-foreground">推荐</span>}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={field.plain || visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={configured ? '已保存，输入新值以替换' : field.placeholder || '未配置'}
          className="pr-9 font-mono text-xs"
          autoComplete="off"
        />
        {!field.plain && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? '隐藏' : '显示'}
            className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        )}
      </div>
      <span className={`justify-self-start rounded px-1.5 py-px text-xs ${configured ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
        {configured ? '已配置' : '—'}
      </span>
    </div>
  );
}

export default function APISettingsTab() {
  const { data: apiKeys, isLoading, error } = useApi('/config/api-keys', { ttl: 0 });
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const dirty = Object.values(formData).some(Boolean);

  const save = async () => {
    setSaving(true);
    try {
      await configApi.updateApiKeys(formData);
      setFormData({});
      toast.success('API 密钥已保存');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <Skeleton className="m-4 h-40" />;
  if (error) return <p className="px-5 py-8 text-muted-foreground">API 密钥加载失败。</p>;

  return (
    <div>
      <div className="grid gap-3 px-5 pb-4 pt-1 xl:grid-cols-2">
      {API_GROUPS.map((group) => (
        <div key={group.id} className="overflow-hidden rounded-xl border border-border">
          <div className="bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">{group.label}</div>
          {group.fields.map((field) => (
            <KeyRow
              key={field.key}
              field={field}
              configured={field.hasKey ? Boolean(apiKeys?.[field.hasKey]) : false}
              value={formData[field.key] || ''}
              onChange={(value) => setFormData((prev) => ({ ...prev, [field.key]: value }))}
            />
          ))}
        </div>
      ))}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-2.5">
        {dirty && <span className="text-xs text-muted-foreground">有未保存的修改</span>}
        <Button onClick={save} disabled={!dirty} isLoading={saving}>保存</Button>
      </div>
    </div>
  );
}
