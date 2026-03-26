import { FC, useEffect, useState } from 'react';
import { Settings2, Puzzle, MessageSquare, KeyRound, Copy, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PluginSettings from './PluginSettings';
import ChatSettings from './ChatSettings';
import { Button } from '@/components/ui/button';
import { authService } from '../services/auth';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: FC<SettingsProps> = ({ isOpen, onClose }) => {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-2xl sm:max-w-2xl p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-5 border-b shrink-0">
          <SheetTitle className="text-xl font-bold text-foreground">
            Settings
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 overflow-hidden">
          <Tabs defaultValue="general" className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 overflow-hidden">
              <TabsList className="w-48 flex-col h-auto rounded-none border-r bg-transparent p-3 gap-1 shrink-0 justify-start">
                <TabsTrigger
                  value="general"
                  className="w-full justify-start gap-2.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                >
                  <Settings2 size={16} />
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="chat"
                  className="w-full justify-start gap-2.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                >
                  <MessageSquare size={16} />
                  Chat
                </TabsTrigger>
                <TabsTrigger
                  value="plugins"
                  className="w-full justify-start gap-2.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                >
                  <Puzzle size={16} />
                  Plugins
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-6">
                <TabsContent value="general" className="mt-0">
                  <GeneralSettings />
                </TabsContent>
                <TabsContent value="chat" className="mt-0">
                  <ChatSettings />
                </TabsContent>
                <TabsContent value="plugins" className="mt-0">
                  <PluginSettings />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const GeneralSettings: FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'access' | 'refresh' | null>(null);

  useEffect(() => {
    setAccessToken(authService.getStoredAccessToken());
    setRefreshToken(authService.getStoredRefreshToken());
  }, []);

  const copyToken = async (value: string, field: 'access' | 'refresh') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      setCopiedField(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Session Tokens</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Use your current access token to authenticate external MCP clients such as OpenWebUI.
        </p>
      </div>

      {!accessToken ? (
        <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
          No active session token found. Log in first to see your current token.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-primary" />
                <span className="text-sm font-medium text-foreground">Access Token</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToken(accessToken, 'access')}
              >
                {copiedField === 'access' ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                {copiedField === 'access' ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <textarea
              readOnly
              value={accessToken}
              className="min-h-32 w-full rounded-md border bg-muted/40 px-3 py-2 text-xs text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Send this as <span className="font-mono">Authorization: Bearer &lt;access_token&gt;</span> when calling the MCP server.
            </p>
          </div>

          {refreshToken && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">Refresh Token</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToken(refreshToken, 'refresh')}
                >
                  {copiedField === 'refresh' ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                  {copiedField === 'refresh' ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <textarea
                readOnly
                value={refreshToken}
                className="min-h-24 w-full rounded-md border bg-muted/40 px-3 py-2 text-xs text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Keep this private. It can mint new access tokens until it expires or is revoked.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;
