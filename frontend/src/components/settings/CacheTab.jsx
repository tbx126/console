import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { useApi } from '../../services/api';
import cacheApi from '../../services/cacheApi';
import { queryStats } from '../../lib/query';

const duration = (seconds) => {
  if (seconds >= 86400) return `${Math.round(seconds / 86400)} 天`;
  if (seconds >= 3600) return `${Math.round(seconds / 3600)} 小时`;
  if (seconds >= 60) return `${Math.round(seconds / 60)} 分钟`;
  return `${seconds} 秒`;
};
const rate = (r, hits, misses) => (hits + misses ? `${Math.round(r * 100)}%` : '—');
const bytes = (n) => (n >= 1 << 30 ? `${(n / (1 << 30)).toFixed(1)} GB` : n >= 1 << 20 ? `${Math.round(n / (1 << 20))} MB` : `${Math.round(n / 1024)} KB`);

function Row({ name, label, entries, life, hitRate, extra, onClear, busy }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_70px_90px_70px_auto] items-center gap-2.5 border-t border-border px-5 py-2">
      <span className="min-w-0 truncate">
        {label} <span className="text-xs text-muted-foreground">{name}</span>
        {extra && <span className="block text-xs text-muted-foreground">{extra}</span>}
      </span>
      <span className="tabular">{entries}</span>
      <span className="text-muted-foreground">{life}</span>
      <span className="tabular">{hitRate}</span>
      <Button variant="outline" size="sm" onClick={onClear} disabled={busy}>清空</Button>
    </div>
  );
}

export default function CacheTab() {
  const { data, isLoading, error, refetch } = useApi('/cache', { ttl: 0 });
  const [busy, setBusy] = useState(false);
  // useApi 订阅了前端缓存，缓存变化时本组件会重新渲染，统计随之更新
  const browser = queryStats();

  const clear = async (name) => {
    setBusy(true);
    try {
      await cacheApi.clear(name);
      await refetch();
      toast.success(name ? '已清空' : '已清空全部缓存');
    } catch {
      toast.error('清空失败');
    } finally {
      setBusy(false);
    }
  };

  const clearBrowser = () => {
    cacheApi.clearBrowser();
    toast.success('已清空浏览器缓存');
  };

  if (isLoading) return <Skeleton className="m-4 h-40" />;
  if (error) return <p className="px-5 py-8 text-muted-foreground">缓存信息加载失败。</p>;

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1.4fr)_70px_90px_70px_auto] gap-2.5 bg-muted px-5 py-2 text-xs text-muted-foreground">
        <span>后端缓存</span><span>条目</span><span>有效期</span><span>命中率</span><span className="w-12" />
      </div>
      {data.namespaces.map((ns) => (
        <Row
          key={ns.name}
          name={ns.name}
          label={ns.label}
          entries={`${ns.size} / ${ns.max_size}`}
          life={duration(ns.ttl_seconds)}
          hitRate={rate(ns.hit_rate, ns.hits, ns.misses)}
          extra={ns.stale_served ? `出错时返回旧值 ${ns.stale_served} 次` : null}
          onClear={() => clear(ns.name)}
          busy={busy}
        />
      ))}
      <Row
        name="steam"
        label={data.steam.label}
        entries={data.steam.size}
        life="7 天"
        hitRate={rate(data.steam.hit_rate, data.steam.hits, data.steam.misses)}
        extra={`磁盘 ${bytes(data.steam.disk.bytes)} / ${bytes(data.steam.disk.max_bytes)} · ${data.steam.disk.files} 个文件（超出后按最久未用清理）`}
        onClear={() => clear('steam')}
        busy={busy}
      />
      <Row
        name="data"
        label={data.data.label}
        entries={data.data.entries}
        life="按文件修改时间"
        hitRate={rate(data.data.hit_rate, data.data.hits, data.data.misses)}
        onClear={() => clear('data')}
        busy={busy}
      />
      <div className="grid grid-cols-[minmax(0,1.4fr)_70px_90px_70px_auto] gap-2.5 border-t border-border bg-muted px-5 py-2 text-xs text-muted-foreground">
        <span>浏览器缓存（本页会话）</span><span>条目</span><span>有效期</span><span>命中率</span><span className="w-12" />
      </div>
      <Row
        name="query"
        label="接口请求"
        entries={browser.entries}
        life="30 秒 – 10 分钟"
        hitRate={rate(browser.hitRate, browser.hits, browser.misses)}
        extra={`写操作后自动失效 · 已失效 ${browser.invalidations} 次`}
        onClear={clearBrowser}
        busy={busy}
      />
      <div className="flex justify-end border-t border-border px-5 py-2.5">
        <Button variant="outline" onClick={() => clear()} isLoading={busy}>清空全部后端缓存</Button>
      </div>
    </div>
  );
}
