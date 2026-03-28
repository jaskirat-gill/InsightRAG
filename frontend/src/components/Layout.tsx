import { useState, FC, ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AnimatedPage } from '@/components/ui/animate';
import AppSidebar from './AppSidebar';
import Settings from './Settings';

interface LayoutProps {
  children: ReactNode;
  onLogout: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  pageTitle?: string;
}

const PAGE_TITLES: Record<string, string> = {
  home: 'Home',
  kb: 'Knowledge Bases',
  'kb-health': 'Health Dashboard',
  doc: 'Document Details',
  chat: 'Chat',
  users: 'User Management',
};

const Layout: FC<LayoutProps> = ({
  children,
  onLogout,
  onNavigate,
  currentPage,
  theme,
  onToggleTheme,
  pageTitle,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const title = pageTitle || PAGE_TITLES[currentPage] || 'OpenWebUI';

  return (
    <SidebarProvider>
      <AppSidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <h1 className="text-sm font-medium">{title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            <AnimatedPage pageKey={currentPage}>
              {children}
            </AnimatedPage>
          </div>
        </main>
      </SidebarInset>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </SidebarProvider>
  );
};

export default Layout;
