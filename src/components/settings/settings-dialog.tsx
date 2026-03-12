import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettingsDialog } from "@/hooks/use-settings-dialog";
import type { SettingsTab } from "@/hooks/use-settings-dialog";
import { cn } from "@/lib/utils";
import { CircleUserIcon, DownloadIcon, SparklesIcon } from "../ui/icons";
import { AccountSettingsContent } from "./account-settings-content";
import { ImportContent } from "./import-content";
import { MembersContent } from "./members-content";

const navItems: {
  key: SettingsTab;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}[] = [
  { key: "account", label: "Account", icon: CircleUserIcon },
  // { key: "members", label: "Members", icon: UsersIcon },
  { key: "ai-features", label: "AI Features", icon: SparklesIcon },
  { key: "import", label: "Import", icon: DownloadIcon },
];

const tabTitles: Record<SettingsTab, string> = {
  account: "Account",
  members: "Members",
  "ai-features": "AI Features",
  import: "Import",
};

function TabContent({ tab }: { tab: SettingsTab }) {
  switch (tab) {
    case "account":
      return <AccountSettingsContent />;
    case "members":
      return <MembersContent />;
    case "ai-features":
      return <SparklesIcon className="size-4 text-muted-foreground" />;
    case "import":
      return <ImportContent />;
  }
}

export function SettingsDialog() {
  const { isOpen, activeTab, close, setTab } = useSettingsDialog();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[rgba(0,0,0,0.36)] backdrop-blur-[4px] duration-150"
        className="w-[740px] h-[min(700px,calc(100vh-80px))] rounded-5xl shadow-[0px_1px_1px_0px_rgba(0,0,0,0.1),0px_0px_0.5px_0px_rgba(0,0,0,0.6),0px_105px_29px_0px_rgba(0,0,0,0),0px_67px_27px_0px_rgba(0,0,0,0.01),0px_38px_23px_0px_rgba(0,0,0,0.04),0px_17px_17px_0px_rgba(0,0,0,0.08),0px_4px_9px_0px_rgba(0,0,0,0.09)] overflow-clip p-0 sm:max-w-none max-w-none data-open:zoom-in-[0.98] data-closed:zoom-out-[0.98] duration-150 flex ring-0"
      >
        {/* Left Sidebar */}
        <div className="relative w-[180px] shrink-0 flex flex-col after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[0.5px] after:bg-[var(--color-gray-100)]">
          {/* Settings label */}
          <div className="px-[18px] pt-5 pb-[12.21px]">
            <p className="text-[13px] font-medium text-muted-foreground">Settings</p>
          </div>

          {/* Nav items */}
          <nav className="px-2 flex flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "h-[30px] w-full px-2 py-[7px] rounded-lg flex items-center gap-2 overflow-hidden cursor-pointer transition-colors",
                    isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                  )}
                >
                  <Icon className="size-[18px] shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content Area — entire section scrolls */}
        <ScrollArea className="flex-1 min-h-0" hideScrollbar>
          <div className="px-12 pt-8 pb-8">
            <DialogTitle className="text-lg font-semibold text-foreground mb-2">
              {tabTitles[activeTab]}
            </DialogTitle>
            <TabContent tab={activeTab} />
          </div>
        </ScrollArea>

        <DialogDescription className="sr-only">Settings dialog</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
