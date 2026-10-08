import { useState } from 'react';
import { Layers, Settings, Key, Database } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { SegmentedTabs } from '../components/ui/SegmentedTabs';
import LLMConfigManager from '../components/settings/LLMConfigManager';
import APISettingsTab from '../components/settings/APISettingsTab';
import DataManagementTab from '../components/settings/DataManagementTab';

const TABS = [
  { id: 'profiles', label: '模型配置', icon: Layers },
  { id: 'api', label: 'API 密钥', icon: Key },
  { id: 'data', label: '数据', icon: Database },
  { id: 'general', label: '通用', icon: Settings, disabled: true }
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profiles');

  return (
    <div className="page">
      <PageHeader eyebrow="Preferences" title="设置" description="模型、API 密钥与数据备份。" />

      <div className="flex flex-col gap-5">
        <SegmentedTabs label="设置分类" tabs={TABS} value={activeTab} onChange={setActiveTab} />

        {/* Tab Content */}
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>
              {TABS.find(t => t.id === activeTab)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === 'profiles' && (
              <LLMConfigManager />
            )}
            {activeTab === 'api' && (
              <APISettingsTab />
            )}
            {activeTab === 'data' && (
              <DataManagementTab />
            )}
            {activeTab === 'general' && (
              <div className="py-8 text-center text-muted-foreground">
                即将推出
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
