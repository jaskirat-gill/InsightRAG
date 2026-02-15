import { FC, useState } from 'react';
import { X, Settings2, Puzzle } from 'lucide-react';
import PluginSettings from './PluginSettings';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

type SettingsTab = 'general' | 'plugins';

const tabs: { key: SettingsTab; label: string; icon: typeof Settings2 }[] = [
    { key: 'general', label: 'General', icon: Settings2 },
    { key: 'plugins', label: 'Plugins', icon: Puzzle },
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
                className="relative w-full max-w-2xl bg-background/95 backdrop-blur-xl border-l border-white/10 shadow-2xl
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
                    <div className="w-48 border-r border-white/5 py-4 px-3 space-y-1 flex-shrink-0">
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
                        {activeTab === 'plugins' && <PluginSettings />}
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
