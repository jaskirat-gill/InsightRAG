import { FC, useState } from 'react';
import { Eye, EyeOff, Plug, TestTube2, Save, Trash2, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

interface PluginCardProps {
    plugin: PluginData;
    onSave: (id: number, config: Record<string, string>) => Promise<void>;
    onToggle: (id: number, active: boolean) => Promise<void>;
    onTest: (id: number) => Promise<{ success: boolean; message: string }>;
    onDelete: (id: number) => Promise<void>;
}

const PluginCard: FC<PluginCardProps> = ({ plugin, onSave, onToggle, onTest, onDelete }) => {
    const [localConfig, setLocalConfig] = useState<Record<string, string>>({ ...plugin.config });
    const [isActive, setIsActive] = useState(plugin.is_active);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
    const [expanded, setExpanded] = useState(true);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

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
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
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
