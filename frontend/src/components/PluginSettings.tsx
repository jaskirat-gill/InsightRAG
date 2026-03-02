import { FC, useState, useEffect } from 'react';
import { Plus, RefreshCw, Puzzle, Loader2 } from 'lucide-react';
import PluginCard from './PluginCard';

import { API_URL } from '../config';

interface ConfigField {
    name: string;
    label: string;
    type: 'text' | 'password' | 'number' | 'select';
    required: boolean;
    placeholder?: string;
    options?: string[];
}

interface PluginData {
    id: number;
    name: string;
    module_name: string;
    class_name: string;
    is_active: boolean;
    config: Record<string, string>;
    config_schema: ConfigField[];
}

interface DiscoveredPlugin {
    class_name: string;
    module_name: string;
    config_schema: ConfigField[];
}

const PluginSettings: FC = () => {
    const [plugins, setPlugins] = useState<PluginData[]>([]);
    const [discovered, setDiscovered] = useState<DiscoveredPlugin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [creating, setCreating] = useState(false);

    const fetchPlugins = async () => {
        setLoading(true);
        setError(null);
        try {
            const [pluginsRes, discoveredRes] = await Promise.all([
                fetch(`${API_URL}/plugins`),
                fetch(`${API_URL}/plugins/discovered`),
            ]);
            if (!pluginsRes.ok) throw new Error('Failed to fetch plugins');
            if (!discoveredRes.ok) throw new Error('Failed to fetch discovered plugins');

            const pluginsData = await pluginsRes.json();
            const discoveredData = await discoveredRes.json();
            setPlugins(pluginsData);
            setDiscovered(discoveredData);
        } catch (err: any) {
            setError(err.message || 'Failed to load plugins');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlugins();
    }, []);

    const handleSave = async (id: number, config: Record<string, string>) => {
        const res = await fetch(`${API_URL}/plugins/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config }),
        });
        if (!res.ok) throw new Error('Failed to save');
    };

    const handleToggle = async (id: number, active: boolean) => {
        const res = await fetch(`${API_URL}/plugins/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: active }),
        });
        if (!res.ok) throw new Error('Failed to toggle');
    };

    const handleTest = async (id: number) => {
        const res = await fetch(`${API_URL}/plugins/${id}/test`, { method: 'POST' });
        if (!res.ok) throw new Error('Test request failed');
        return await res.json();
    };

    const handleDelete = async (id: number) => {
        const res = await fetch(`${API_URL}/plugins/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        setPlugins(prev => prev.filter(p => p.id !== id));
    };

    const handleAddPlugin = async (disc: DiscoveredPlugin) => {
        setCreating(true);
        setShowAddMenu(false);
        try {
            const displayName = disc.class_name.replace(/Plugin$/i, '').toLowerCase();
            const name = `${displayName}-${Date.now().toString(36)}`;
            const res = await fetch(`${API_URL}/plugins`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    module_name: disc.module_name,
                    class_name: disc.class_name,
                    is_active: false,
                    config: {},
                }),
            });
            if (!res.ok) throw new Error('Failed to create plugin');
            await fetchPlugins();
        } finally {
            setCreating(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="ml-3 text-secondary">Loading plugins...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="text-center py-16">
                <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                    {error}
                </div>
                <div>
                    <button
                        onClick={fetchPlugins}
                        className="text-sm text-secondary hover:text-white transition-colors flex items-center gap-1.5 mx-auto"
                    >
                        <RefreshCw size={14} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Source Plugins</h3>
                    <p className="text-xs text-secondary mt-0.5">
                        Configure cloud storage integrations. Plugins are auto-discovered from the backend.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchPlugins}
                        className="p-2 rounded-xl text-secondary hover:text-white hover:bg-white/5 transition-all border border-white/10"
                        title="Refresh"
                    >
                        <RefreshCw size={15} />
                    </button>

                    {/* Add Plugin */}
                    <div className="relative">
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            disabled={creating}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold
                                bg-primary text-white hover:bg-primary/90 transition-all shadow-md shadow-primary/20 whitespace-nowrap"
                        >
                            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Add Plugin
                        </button>

                        {/* Dropdown */}
                        {showAddMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-surface border border-white/10 shadow-2xl shadow-black/50 py-1.5 z-50">
                                {discovered.length === 0 ? (
                                    <div className="px-4 py-3 text-xs text-secondary">No plugins discovered</div>
                                ) : (
                                    discovered.map((disc) => (
                                        <button
                                            key={disc.class_name}
                                            onClick={() => handleAddPlugin(disc)}
                                            className="w-full text-left px-4 py-2.5 text-sm text-secondary hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2.5"
                                        >
                                            <Puzzle size={14} className="text-primary" />
                                            <div>
                                                <div className="font-medium text-white text-xs">
                                                    {disc.class_name.replace(/Plugin$/i, '')}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Plugin Cards */}
            {plugins.length === 0 ? (
                <div className="text-center py-16">
                    <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Puzzle size={28} className="text-secondary" />
                    </div>
                    <p className="text-secondary text-sm">No plugins configured yet.</p>
                    <p className="text-secondary/60 text-xs mt-1">Click "Add Plugin" to get started.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {plugins.map((plugin) => (
                        <PluginCard
                            key={plugin.id}
                            plugin={plugin}
                            onSave={handleSave}
                            onToggle={handleToggle}
                            onTest={handleTest}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PluginSettings;
