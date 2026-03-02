import { useSettingsDialog, type SettingsTab } from "@/hooks/use-settings-dialog";
import { cn } from "@/lib/utils";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { CircleUserIcon, DownloadIcon, SparklesIcon, UsersIcon } from "../ui/sidebar-icons";
import { AccountSettingsContent } from "./account-settings-content";
import { ImportContent } from "./import-content";
import { MembersContent } from "./members-content";

const navItems: { key: SettingsTab; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { key: "account", label: "Account", icon: CircleUserIcon },
  { key: "members", label: "Members", icon: UsersIcon },
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
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.36)] backdrop-blur-[4px] data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 duration-150"
        />
        <DialogPrimitive.Popup
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[740px] h-[min(700px,calc(100vh-80px))] bg-background rounded-[20px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.1),0px_0px_0.5px_0px_rgba(0,0,0,0.6),0px_105px_29px_0px_rgba(0,0,0,0),0px_67px_27px_0px_rgba(0,0,0,0.01),0px_38px_23px_0px_rgba(0,0,0,0.04),0px_17px_17px_0px_rgba(0,0,0,0.08),0px_4px_9px_0px_rgba(0,0,0,0.09)] overflow-clip outline-none data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 data-open:zoom-in-[0.98] data-closed:zoom-out-[0.98] duration-150 flex"
        >
          {/* Left Sidebar */}
          <div className="w-[180px] shrink-0 border-r-[0.5px] border-solid border-[var(--gray-100,#f5f5f5)] flex flex-col">
            {/* Settings label */}
            <div className="px-[18px] pt-5 pb-3">
              <span className="text-[13px] font-medium text-[var(--gray-600)] tracking-[0.26px]">
                Settings
              </span>
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
                      "h-[30px] w-full px-2 py-[7px] rounded-lg flex items-center gap-2 cursor-pointer transition-colors",
                      isActive
                        ? "bg-[var(--gray-100)]"
                        : "hover:bg-[var(--gray-100)]/50",
                    )}
                  >
                    <Icon className="size-[18px] text-muted-foreground" />
                    <span className="text-sm font-medium text-[var(--gray-800)] tracking-[0.14px]">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header with title and close button */}
            <div className="flex items-center justify-between px-12 pt-8 pb-4 shrink-0">
              <DialogPrimitive.Title className="text-lg font-semibold text-[var(--gray-900)]">
                {tabTitles[activeTab]}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="size-7 rounded-lg flex items-center justify-center hover:bg-[var(--gray-100)] transition-colors cursor-pointer"
              >
                <X className="size-4 text-muted-foreground" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-12 pb-8">
              <TabContent tab={activeTab} />
            </div>
          </div>

          <DialogPrimitive.Description className="sr-only">
            Settings dialog
          </DialogPrimitive.Description>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
