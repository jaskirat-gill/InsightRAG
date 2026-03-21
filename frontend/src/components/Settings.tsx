import { FC } from 'react';
import { Settings2, Puzzle, MessageSquare } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PluginSettings from './PluginSettings';
import ChatSettings from './ChatSettings';

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
  return (
    <p className="text-sm text-muted-foreground">
      General settings will be available in a future update.
    </p>
  );
};

export default Settings;
