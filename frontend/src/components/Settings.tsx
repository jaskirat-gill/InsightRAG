import { FC } from 'react';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const Settings: FC<SettingsProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 bg-surface rounded-2xl border border-secondary/20 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
                >
                    ✕
                </button>

                <h2 className="text-2xl font-bold mb-6 text-white">Settings</h2>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-secondary">Inference Server</label>
                        <input
                            type="text"
                            placeholder="http://localhost:11434"
                            className="w-full px-4 py-2 bg-background border border-secondary/20 rounded-lg focus:outline-none focus:border-primary text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-secondary">System Prompt</label>
                        <textarea
                            rows={3}
                            placeholder="You are a helpful assistant..."
                            className="w-full px-4 py-2 bg-background border border-secondary/20 rounded-lg focus:outline-none focus:border-primary text-white resize-none"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-secondary hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
