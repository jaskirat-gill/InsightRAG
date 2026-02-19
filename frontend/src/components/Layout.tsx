import { useState, FC, ReactNode } from 'react';
import Background from './Background';
import Navigation from './Navigation';
import Settings from './Settings';

interface LayoutProps {
    children: ReactNode;
    onLogout: () => void;
    onNavigate: (page: string) => void;
    currentPage: string; // Add this prop
}

const Layout: FC<LayoutProps> = ({ children, onLogout, onNavigate, currentPage }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="relative h-screen overflow-hidden text-white font-sans antialiased selection:bg-primary/30">
            <Background />

            <div className="relative z-10 h-full overflow-y-auto">
                <main className="p-6 pb-40 max-w-7xl mx-auto">
                    {children}
                </main>
            </div>

            <Navigation
                onSettingsClick={() => setIsSettingsOpen(true)}
                onLogout={onLogout}
                onNavigate={onNavigate}
                currentPage={currentPage} // Pass current page
            />

            <Settings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};

export default Layout;