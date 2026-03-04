import { useState, FC, ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import Background from './Background';
import Navigation from './Navigation';
import Settings from './Settings';

interface LayoutProps {
    children: ReactNode;
    onLogout: () => void;
    onNavigate: (page: string) => void;
    currentPage: string;
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
}

const Layout: FC<LayoutProps> = ({
    children,
    onLogout,
    onNavigate,
    currentPage,
    theme,
    onToggleTheme,
}) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const pageBackground = theme === 'light' ? '#ffffff' : '#0f172a';
    const pageText = theme === 'light' ? '#0f172a' : '#f8fafc';

    return (
        <div
            className="relative h-screen overflow-hidden font-sans antialiased selection:bg-primary/30"
            style={{ backgroundColor: pageBackground, color: pageText }}
        >
            <Background theme={theme} />

            <div className="relative z-10 h-full overflow-y-auto">
                <button
                    onClick={onToggleTheme}
                    className="theme-toggle-btn fixed top-4 left-4 z-50 px-2.5 py-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1.5"
                    style={{
                        backgroundColor: theme === 'light' ? 'rgba(241, 245, 249, 0.95)' : 'rgba(51, 65, 85, 0.75)',
                        color: theme === 'light' ? '#0f172a' : '#f8fafc',
                        borderColor: theme === 'light' ? 'rgba(148, 163, 184, 0.55)' : 'rgba(148, 163, 184, 0.35)',
                    }}
                >
                    {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                    <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                </button>
                <main className="p-6 pb-40 max-w-7xl mx-auto">
                    {children}
                </main>
            </div>

            <Navigation
                onSettingsClick={() => setIsSettingsOpen(true)}
                onLogout={onLogout}
                onNavigate={onNavigate}
                currentPage={currentPage}
                theme={theme}
                onToggleTheme={onToggleTheme}
            />

            <Settings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};

export default Layout;
