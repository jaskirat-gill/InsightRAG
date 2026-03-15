import { FC, useState, useEffect } from 'react';
import { Plus, RefreshCw, Puzzle, Loader2 } from 'lucide-react';
import PluginCard from './PluginCard';
import { API_URL } from '../config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading plugins...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-8">
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                        <Button variant="ghost" size="sm" onClick={fetchPlugins} className="gap-1.5">
                            <RefreshCw size={14} /> Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-5">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                        <CardTitle className="text-lg text-foreground">Source Plugins</CardTitle>
                        <CardDescription className="mt-0.5">
                            Configure cloud storage integrations. Plugins are auto-discovered from the backend.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchPlugins}
                            title="Refresh"
                        >
                            <RefreshCw size={15} />
                        </Button>
                        <div className="relative">
                            <Button
                                size="sm"
                                onClick={() => setShowAddMenu(!showAddMenu)}
                                disabled={creating}
                                className="gap-1.5"
                            >
                                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Add Plugin
                            </Button>
                            {showAddMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 rounded-md border bg-popover p-1 shadow-md z-50">
                                    {discovered.length === 0 ? (
                                        <div className="px-4 py-3 text-xs text-muted-foreground">No plugins discovered</div>
                                    ) : (
                                        discovered.map((disc) => (
                                            <button
                                                key={disc.class_name}
                                                onClick={() => handleAddPlugin(disc)}
                                                className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2.5 rounded-sm"
                                            >
                                                <Puzzle size={14} className="text-primary" />
                                                <div>
                                                    <div className="font-medium text-foreground text-xs">
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
                </CardHeader>
                <CardContent>
                    {plugins.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                                <Puzzle size={28} className="text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground text-sm">No plugins configured yet.</p>
                            <p className="text-muted-foreground/60 text-xs mt-1">Click "Add Plugin" to get started.</p>
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
                </CardContent>
            </Card>
        </div>
    );
};

export default PluginSettings;
