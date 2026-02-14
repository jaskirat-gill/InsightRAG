import { FC } from 'react';

interface NavigationProps {
    onSettingsClick: () => void;
    onLogout: () => void;
}

const Navigation: FC<NavigationProps> = ({ onSettingsClick, onLogout }) => {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
            <div className="flex items-center gap-2 p-2 bg-surface/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-black/50">
                <NavItem icon="🏠" label="Home" active />
                <NavItem icon="💬" label="Chat" />
                <NavItem icon="📚" label="Library" />

                <div className="w-px h-6 bg-white/10 mx-2" />

                <NavItem icon="⚙️" label="Settings" onClick={onSettingsClick} />
                <NavItem icon="🚪" label="Logout" onClick={onLogout} danger />
            </div>
        </div>
    );
};

interface NavItemProps {
    icon: string;
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
        ${active ? 'bg-primary/20 text-white' : 'hover:bg-white/5'}
        ${danger ? 'hover:bg-red-500/20' : ''}
      `}
        >
            <span className="text-xl">{icon}</span>

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
