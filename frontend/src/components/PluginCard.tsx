import { FC, useState } from 'react';
import { Eye, EyeOff, Plug, TestTube2, Save, Trash2, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

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

    const handleToggle = async () => {
        const newState = !isActive;
        setIsActive(newState);
        try {
            await onToggle(plugin.id, newState);
        } catch {
            setIsActive(!newState); // revert on failure
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

    // Friendly class name: "S3Plugin" => "S3"
    const displayName = plugin.class_name.replace(/Plugin$/i, '');

    return (
        <div
            className={`
                relative rounded-2xl border backdrop-blur-sm transition-all duration-500 overflow-hidden
                ${isActive
                    ? 'bg-surface/60 border-primary/30 shadow-lg shadow-primary/5'
                    : 'bg-surface/30 border-white/5 opacity-70'}
            `}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className={`
                        h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300
                        ${isActive ? 'bg-primary/20 text-primary' : 'bg-white/5 text-secondary'}
                    `}>
                        <Plug size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">{displayName} Plugin</h3>
                        <p className="text-xs text-secondary font-mono">{plugin.name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Expand / Collapse */}
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1.5 text-secondary hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {/* Active Toggle */}
                    <button
                        onClick={handleToggle}
                        className={`
                            relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none
                            ${isActive ? 'bg-primary shadow-md shadow-primary/30' : 'bg-white/10'}
                        `}
                    >
                        <span
                            className={`
                                absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
                                transition-transform duration-300
                                ${isActive ? 'translate-x-6' : 'translate-x-0'}
                            `}
                        />
                    </button>
                </div>
            </div>

            {/* Config Fields — collapsible */}
            <div
                className={`
                    transition-all duration-500 ease-in-out overflow-hidden
                    ${expanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}
                `}
            >
                <div className="px-5 pb-5 space-y-4">
                    {/* Form Fields */}
                    <div className="space-y-3 pt-2">
                        {plugin.config_schema.map((field) => (
                            <div key={field.name} className="space-y-1.5">
                                <label className="text-xs font-medium text-secondary uppercase tracking-wider flex items-center gap-1">
                                    {field.label}
                                    {field.required && <span className="text-red-400">*</span>}
                                </label>
                                <div className="relative">
                                    <input
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
                                        className={`
                                            w-full px-3.5 py-2.5 rounded-xl text-sm font-mono
                                            bg-background/80 border transition-all duration-200
                                            text-white placeholder:text-secondary/50
                                            focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50
                                            ${isActive ? 'border-white/10' : 'border-white/5 text-secondary'}
                                        `}
                                        disabled={!isActive}
                                    />
                                    {field.type === 'password' && (
                                        <button
                                            onClick={() => togglePasswordVisibility(field.name)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors"
                                            type="button"
                                        >
                                            {showPasswords[field.name]
                                                ? <EyeOff size={14} />
                                                : <Eye size={14} />
                                            }
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2">
                            {/* Test Connection */}
                            <button
                                onClick={handleTest}
                                disabled={!isActive || testing}
                                className={`
                                    flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium
                                    transition-all duration-200
                                    ${isActive
                                        ? 'bg-white/5 text-secondary hover:bg-white/10 hover:text-white border border-white/10'
                                        : 'bg-white/2 text-secondary/50 border border-white/5 cursor-not-allowed'}
                                `}
                            >
                                {testing ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : testResult ? (
                                    testResult.success ? (
                                        <CheckCircle size={14} className="text-green-400" />
                                    ) : (
                                        <XCircle size={14} className="text-red-400" />
                                    )
                                ) : (
                                    <TestTube2 size={14} />
                                )}
                                {testing ? 'Testing...' : testResult ? testResult.message : 'Test Connection'}
                            </button>

                            {/* Delete */}
                            <button
                                onClick={handleDelete}
                                className={`
                                    flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                                    transition-all duration-200 border
                                    ${confirmDelete
                                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                        : 'bg-white/5 text-secondary hover:bg-red-500/10 hover:text-red-400 border-white/10 hover:border-red-500/20'}
                                `}
                            >
                                <Trash2 size={13} />
                                {confirmDelete ? 'Confirm Delete' : 'Delete'}
                            </button>
                        </div>

                        {/* Save */}
                        <button
                            onClick={handleSave}
                            disabled={!isActive || saving}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                                transition-all duration-200
                                ${saveSuccess
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : isActive
                                        ? 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20'
                                        : 'bg-white/5 text-secondary/50 cursor-not-allowed'}
                            `}
                        >
                            {saving ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : saveSuccess ? (
                                <CheckCircle size={14} />
                            ) : (
                                <Save size={14} />
                            )}
                            {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PluginCard;
