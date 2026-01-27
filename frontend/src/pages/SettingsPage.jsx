import { useState } from 'react';
import { Layers, Settings, Key } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import LLMConfigManager from '../components/settings/LLMConfigManager';
import APISettingsTab from '../components/settings/APISettingsTab';

const TABS = [
  { id: 'profiles', label: 'Model Profiles', icon: Layers },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'general', label: 'General', icon: Settings, disabled: true }
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profiles');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">Configure your application</p>
      </div>

      <div className="flex gap-6">
        {/* Tab Navigation */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                    : tab.disabled
                    ? 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <Card className="flex-1 max-w-2xl">
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
            {activeTab === 'general' && (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                Coming soon...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
