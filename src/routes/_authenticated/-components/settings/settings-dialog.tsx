import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SettingsTab } from "@/hooks/use-settings-dialog";
import { useSettingsDialog } from "@/hooks/use-settings-dialog";
import { useCallback } from "react";
import { SidebarItem } from "@/components/sidebar-item";
import { CircleUserIcon, CreditCardIcon, FileCodeIcon } from "@/components/ui/icons";
import { AccountSettingsContent } from "./account-settings-content";
import { ApiKeysContent } from "./api-keys-content";
import { BillingContent } from "./billing-content";
import { MembersContent } from "./members-content";

const navItems: {
  key: SettingsTab;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}[] = [
  { key: "account", label: "Account", icon: CircleUserIcon },
  { key: "billing", label: "Billing", icon: CreditCardIcon },
  { key: "api-keys", label: "API Keys", icon: FileCodeIcon },
];

const tabTitles: Record<SettingsTab, string> = {
  account: "Account",
  members: "Members",
  billing: "Billing",
  "api-keys": "API Keys",
};

const TabContent = ({ tab }: { tab: SettingsTab }) => {
  switch (tab) {
    case "account":
      return <AccountSettingsContent />;
    case "members":
      return <MembersContent />;
    case "billing":
      return <BillingContent />;
    case "api-keys":
      return <ApiKeysContent />;
  }
};

export const SettingsDialog = () => {
  const { isOpen, activeTab, close, setTab } = useSettingsDialog();

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) close();
    },
    [close],
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[rgba(0,0,0,0.36)] backdrop-blur-[4px] duration-150"
        className="w-[740px] h-[min(700px,calc(100vh-80px))] rounded-5xl shadow-[0px_1px_1px_0px_rgba(0,0,0,0.1),0px_0px_0.5px_0px_rgba(0,0,0,0.6),0px_105px_29px_0px_rgba(0,0,0,0),0px_67px_27px_0px_rgba(0,0,0,0.01),0px_38px_23px_0px_rgba(0,0,0,0.04),0px_17px_17px_0px_rgba(0,0,0,0.08),0px_4px_9px_0px_rgba(0,0,0,0.09)] overflow-clip p-0 sm:max-w-none max-w-none data-open:zoom-in-[0.98] data-closed:zoom-out-[0.98] duration-150 flex ring-0"
      >
        {/* Left Sidebar */}
        <div className="relative w-[180px] shrink-0 flex flex-col after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[0.5px] after:bg-gray-100">
          {/* Settings label */}
          <div className="px-[18px] pt-5 pb-[12.21px]">
            <p className="text-sm font-medium tracking-[0.26px] text-muted-foreground">Settings</p>
          </div>

          {/* Nav items */}
          <nav className="px-2 flex flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <SidebarItem
                  label={item.label}
                  key={item.key}
                  isActive={isActive}
                  onClick={() => setTab(item.key)}
                  prefix={<Icon className="size-[18px] shrink-0 text-muted-foreground" />}
                />
              );
            })}
          </nav>
        </div>

        {/* Right Content Area — entire section scrolls */}
        <ScrollArea className="flex-1 min-h-0" hideScrollbar>
          <div className="px-12.25 pt-8 pb-8">
            <DialogTitle className="text-xl font-semibold text-foreground mb-4">
              {tabTitles[activeTab]}
            </DialogTitle>
            <TabContent tab={activeTab} />
          </div>
        </ScrollArea>

        <DialogDescription className="sr-only">Settings dialog</DialogDescription>
      </DialogContent>
    </Dialog>
  );
};
