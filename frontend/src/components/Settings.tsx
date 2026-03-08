import { FC, useState } from 'react';
import { X, Settings2, Puzzle, MessageSquare, Users } from 'lucide-react';
import PluginSettings from './PluginSettings';
import ChatSettings from './ChatSettings';
import UserManagement from './UserManagement';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'general' | 'plugins' | 'chat' | 'users';

const tabs: { key: SettingsTab; label: string; icon: typeof Settings2 }[] = [
  { key: 'general', label: 'General', icon: Settings2 },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'plugins', label: 'Plugins', icon: Puzzle },
  { key: 'users', label: 'Users', icon: Users },
];

const Settings: FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="settings-panel relative w-full max-w-2xl bg-background/95 backdrop-blur-xl border-l border-white/10 shadow-2xl
          flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-secondary hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="settings-sidebar w-48 border-r border-white/5 py-4 px-3 space-y-1 flex-shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-secondary hover:text-white hover:bg-white/5'}
                  `}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'chat' && <ChatSettings />}
            {activeTab === 'plugins' && <PluginSettings />}
            {activeTab === 'users' && <UserManagement />}
          </div>
        </div>
      </div>
    </div>
  );
};

const GeneralSettings: FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">General</h3>
        <p className="text-sm text-secondary">
          Basic workspace preferences and defaults.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-surface/50 p-5 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-white">Compact Navigation</div>
            <div className="text-xs text-secondary mt-1">Reduce spacing in the bottom taskbar.</div>
          </div>
          <button className="h-6 w-11 rounded-full bg-white/10 border border-white/10 relative">
            <span className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white/80" />
          </button>
        </div>

        <div className="h-px bg-white/5" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-white">Show Tooltips</div>
            <div className="text-xs text-secondary mt-1">Display labels when hovering navigation icons.</div>
          </div>
          <button className="h-6 w-11 rounded-full bg-primary border border-primary/40 relative">
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-white" />
          </button>
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-3">
        <button className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Settings;
