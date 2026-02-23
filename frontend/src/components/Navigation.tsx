import { FC, ReactNode } from 'react';
import { Home, MessageSquare, Library, Database, Settings, LogOut } from 'lucide-react';

interface NavigationProps {
    onSettingsClick: () => void;
    onLogout: () => void;
    onNavigate?: (page: string) => void;
    currentPage?: string; // Add this prop
}

const Navigation: FC<NavigationProps> = ({ onSettingsClick, onLogout, onNavigate, currentPage = 'home' }) => {
    return (
        <div id="app-taskbar" className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
            <div className="flex items-center gap-2 p-2 bg-surface/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-black/50">
                <NavItem 
                    icon={<Home size={20} />} 
                    label="Home" 
                    onClick={() => onNavigate?.('home')}
                    active={currentPage === 'home'} // Dynamic active state
                />
                <NavItem 
                    icon={<Database size={20} />} 
                    label="Knowledge Bases" 
                    onClick={() => onNavigate?.('kb')}
                    active={currentPage === 'kb'} // Dynamic active state
                />
                <NavItem
                    icon={<MessageSquare size={20} />}
                    label="Chat"
                    onClick={() => onNavigate?.('chat')}
                    active={currentPage === 'chat'}
                />
                <NavItem icon={<Library size={20} />} label="Library" />

                <div className="w-px h-6 bg-white/10 mx-2" />

                <NavItem icon={<Settings size={20} />} label="Settings" onClick={onSettingsClick} />
                <NavItem icon={<LogOut size={20} />} label="Logout" onClick={onLogout} danger />
            </div>
        </div>
    );
};

interface NavItemProps {
    icon: ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
    danger?: boolean;
}

const NavItem: FC<NavItemProps> = ({ icon, label, active, onClick, danger }) => {
    return (
        <button
            onClick={onClick}
            className={`
        relative group p-3 rounded-full transition-all duration-300 hover:scale-110
        ${active ? 'bg-primary/20 text-white' : 'text-secondary hover:text-white hover:bg-white/5'}
        ${danger ? 'hover:bg-red-500/20 hover:text-red-400' : ''}
      `}
        >
            {icon}

            {/* Tooltip */}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {label}
            </span>

            {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full mb-1" />
            )}
        </button>
    );
};

export default Navigation;