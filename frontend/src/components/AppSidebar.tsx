import { FC } from 'react';
import {
  Home,
  Database,
  MessageSquare,
  Settings,
  LogOut,
  Moon,
  Sun,
  Users,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Effect, Effects } from '@/components/ui/animate';

interface AppSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onSettingsClick: () => void;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const navItems = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'kb', label: 'Knowledge Bases', icon: Database },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'users', label: 'User Management', icon: Users },
];

const AppSidebar: FC<AppSidebarProps> = ({
  currentPage,
  onNavigate,
  onSettingsClick,
  onLogout,
  theme,
  onToggleTheme,
}) => {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <Effect
          slide="right"
          className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:justify-center"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Database className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold truncate group-data-[collapsible=icon]:hidden">
            InsightRAG
          </span>
        </Effect>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <Effects className="space-y-1">
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  currentPage === item.key ||
                  (item.key === 'kb' &&
                    (currentPage === 'kb-health' || currentPage === 'doc'));
                return (
                  <Effect
                    key={item.key}
                    slide="right"
                    delay={isActive ? 0 : 0.04}
                    whileHover={{ x: 4 }}
                  >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => onNavigate(item.key)}
                      isActive={isActive}
                      tooltip={item.label}
                      className="transition-all duration-200 data-[active=true]:shadow-sm"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  </Effect>
                );
              })}
            </SidebarMenu>
            </Effects>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onSettingsClick}
                  tooltip="Settings"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Effects className="space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onToggleTheme} tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              tooltip="Sign out"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        </Effects>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
