import { FC, useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Plug, TestTube2, Save, Trash2, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { API_URL } from '../config';

interface ConfigField {
    name: string;
    label: string;
    type: 'text' | 'password' | 'number' | 'select' | 'oauth';
    required: boolean;
    placeholder?: string;
    options?: string[];
    oauth_provider?: string;
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

interface PluginCardProps {
    plugin: PluginData;
    onSave: (id: number, config: Record<string, string>) => Promise<void>;
    onToggle: (id: number, active: boolean) => Promise<void>;
    onTest: (id: number) => Promise<{ success: boolean; message: string }>;
    onDelete: (id: number) => Promise<void>;
    onRefresh?: () => Promise<void>;
}

const PluginCard: FC<PluginCardProps> = ({ plugin, onSave, onToggle, onTest, onDelete, onRefresh }) => {
    const [localConfig, setLocalConfig] = useState<Record<string, string>>({ ...plugin.config });
    const [isActive, setIsActive] = useState(plugin.is_active);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
    const [expanded, setExpanded] = useState(true);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [authorizing, setAuthorizing] = useState(false);

    // Listen for OAuth popup success messages
    const handleOAuthMessage = useCallback(
        async (event: MessageEvent) => {
            if (
                event.data?.type === 'oauth-success' &&
                event.data?.pluginId === plugin.id
            ) {
                setAuthorizing(false);
                // Refresh plugin data to pick up stored tokens
                if (onRefresh) await onRefresh();
            }
        },
        [plugin.id, onRefresh]
    );

    useEffect(() => {
        window.addEventListener('message', handleOAuthMessage);
        return () => window.removeEventListener('message', handleOAuthMessage);
    }, [handleOAuthMessage]);

    // Update local config when plugin prop changes (e.g. after OAuth refresh)
    useEffect(() => {
        setLocalConfig({ ...plugin.config });
    }, [plugin.config]);

    const handleOAuthAuthorize = async () => {
        setAuthorizing(true);

        // Open the popup IMMEDIATELY in the click handler (synchronous)
        // so the browser doesn't block it as a popup.
        const popup = window.open('about:blank', '_blank', 'width=600,height=700,scrollbars=yes');

        try {
            const res = await fetch(`${API_URL}/plugins/${plugin.id}/oauth/authorize`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: 'Failed to get authorization URL' }));
                throw new Error(err.detail || 'Failed to get authorization URL');
            }
            const { authorize_url } = await res.json();

            if (popup) {
                // Navigate the already-open popup to Google's consent page
                popup.location.href = authorize_url;
            } else {
                // Fallback: if popup was still blocked, redirect in current tab
                window.location.href = authorize_url;
            }
        } catch (err: any) {
            if (popup) popup.close();
            setAuthorizing(false);
            alert(err.message || 'Failed to start authorization. Make sure Client ID and Secret are saved first.');
        }
    };

    const handleToggle = async (newState: boolean) => {
        setIsActive(newState);
        try {
            await onToggle(plugin.id, newState);
        } catch {
            setIsActive(!newState);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveSuccess(false);
        try {
            await onSave(plugin.id, localConfig);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await onTest(plugin.id);
            setTestResult(result);
            setTimeout(() => setTestResult(null), 5000);
        } finally {
            setTesting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
            return;
        }
        await onDelete(plugin.id);
    };

    const togglePasswordVisibility = (name: string) => {
        setShowPasswords(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const displayName = plugin.class_name.replace(/Plugin$/i, '');

    return (
        <Card
            className={`
                transition-all duration-500 overflow-hidden
                ${isActive ? 'border-primary/30 shadow-lg' : 'opacity-70'}
            `}
        >
            <Collapsible open={expanded} onOpenChange={setExpanded}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-3">
                    <div className="flex items-center gap-3">
                        <div
                            className={`
                                h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300
                                ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                            `}
                        >
                            <Plug size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg text-foreground">{displayName} Plugin</CardTitle>
                                <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                                    {isActive ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{plugin.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </Button>
                        </CollapsibleTrigger>
                        <Switch checked={isActive} onCheckedChange={(checked) => handleToggle(checked)} />
                    </div>
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="px-5 pb-5 pt-0 space-y-4">
                        <div className="space-y-3 pt-2">
                            {plugin.config_schema.map((field) => (
                                <div key={field.name} className="space-y-1.5">
                                    <Label className="text-xs uppercase tracking-wider flex items-center gap-1 text-muted-foreground">
                                        {field.label}
                                        {field.required && <span className="text-destructive">*</span>}
                                    </Label>

                                    {field.type === 'oauth' ? (
                                        /* OAuth authorization widget */
                                        <div className="flex items-center gap-3">
                                            {localConfig[field.name] &&
                                             typeof localConfig[field.name] === 'object' &&
                                             (localConfig[field.name] as any)?.refresh_token ? (
                                                <>
                                                    <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                                                        <ShieldCheck size={13} />
                                                        Authorized
                                                    </Badge>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleOAuthAuthorize}
                                                        disabled={authorizing}
                                                        className="gap-1.5"
                                                    >
                                                        {authorizing ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <ExternalLink size={13} />
                                                        )}
                                                        Re-authorize
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleOAuthAuthorize}
                                                    disabled={authorizing}
                                                    className="gap-2"
                                                >
                                                    {authorizing ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <ExternalLink size={14} />
                                                    )}
                                                    {authorizing ? 'Waiting for authorization...' : 'Authorize with Google'}
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        /* Standard input fields */
                                        <div className="relative">
                                            <Input
                                                type={
                                                    field.type === 'password' && !showPasswords[field.name]
                                                        ? 'password'
                                                        : 'text'
                                                }
                                                value={localConfig[field.name] || ''}
                                                onChange={(e) =>
                                                    setLocalConfig(prev => ({
                                                        ...prev,
                                                        [field.name]: e.target.value
                                                    }))
                                                }
                                                placeholder={field.placeholder}
                                                disabled={!isActive}
                                                className="pr-9 font-mono"
                                            />
                                            {field.type === 'password' && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    onClick={() => togglePasswordVisibility(field.name)}
                                                >
                                                    {showPasswords[field.name]
                                                        ? <EyeOff size={14} />
                                                        : <Eye size={14} />
                                                    }
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTest}
                                    disabled={!isActive || testing}
                                    className="gap-2"
                                >
                                    {testing ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : testResult ? (
                                        testResult.success ? (
                                            <CheckCircle size={14} className="text-status-success" />
                                        ) : (
                                            <XCircle size={14} className="text-destructive" />
                                        )
                                    ) : (
                                        <TestTube2 size={14} />
                                    )}
                                    {testing ? 'Testing...' : testResult ? testResult.message : 'Test Connection'}
                                </Button>
                                <Button
                                    variant={confirmDelete ? 'destructive' : 'outline'}
                                    size="sm"
                                    onClick={handleDelete}
                                    className="gap-1.5"
                                >
                                    <Trash2 size={13} />
                                    {confirmDelete ? 'Confirm Delete' : 'Delete'}
                                </Button>
                            </div>

                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={!isActive || saving}
                                variant={saveSuccess ? 'outline' : 'default'}
                                className={saveSuccess ? 'gap-2 border-status-success/30 bg-status-success/10 text-status-success hover:bg-status-success/20' : 'gap-2'}
                            >
                                {saving ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : saveSuccess ? (
                                    <CheckCircle size={14} />
                                ) : (
                                    <Save size={14} />
                                )}
                                {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                            </Button>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
};

export default PluginCard;
