import { useState } from 'react';
import { Database, HardDrive, KeyRound } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { cn } from '../lib/utils';
import APISettingsTab from '../components/settings/APISettingsTab';
import CacheTab from '../components/settings/CacheTab';
import DataManagementTab from '../components/settings/DataManagementTab';

const TABS = [
  { id: 'api', label: 'API 密钥', icon: KeyRound, meta: '航班查询、地图与 Steam', component: APISettingsTab, flush: true },
  { id: 'cache', label: '缓存', icon: HardDrive, meta: '查看命中情况，按类别清空', component: CacheTab, flush: true },
  { id: 'data', label: '数据与备份', icon: Database, meta: '自动快照与手动归档', component: DataManagementTab },
];

export default function SettingsPage() {
  const [active, setActive] = useState('api');
  const tab = TABS.find((t) => t.id === active);
  const Body = tab.component;

  return (
    <div className="page">
      <PageHeader title="设置" />
      <div className="flex flex-wrap items-start gap-4">
        <nav aria-label="设置分类" className="flex flex-[1_1_160px] flex-row flex-wrap gap-0.5 sm:max-w-[200px] sm:flex-col">
          {TABS.map(({ id, label, icon }) => {
            const Icon = icon;
            return (
            <button
              key={id}
              type="button"
              aria-current={id === active ? 'page' : undefined}
              onClick={() => setActive(id)}
              className={cn(
                'flex h-8 items-center gap-2 rounded-[10px] px-2.5 text-left',
                id === active ? 'bg-accent font-semibold text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </button>
            );
          })}
        </nav>
        <Section className="min-w-0 flex-[999_1_560px]" title={tab.label} meta={tab.meta} bodyClassName={tab.flush ? 'p-0 pt-2' : undefined}>
          <Body />
        </Section>
      </div>
    </div>
  );
}
