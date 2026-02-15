import { useState, FC, ReactNode } from 'react';
import Background from './Background';
import Navigation from './Navigation';
import Settings from './Settings';

interface LayoutProps {
    children: ReactNode;
    onLogout: () => void;
}

const Layout: FC<LayoutProps> = ({ children, onLogout }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="relative min-h-screen text-white font-sans antialiased selection:bg-primary/30">
            <Background />

            <main className="relative z-10 p-6 pb-32 max-w-7xl mx-auto">
                {children}
            </main>

            <Navigation
                onSettingsClick={() => setIsSettingsOpen(true)}
                onLogout={onLogout}
            />

            <Settings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};

export default Layout;
