import { TabButton } from "@/components/ui/tab-button";
import type { ActiveTab } from "./-types";

interface UsersTabsProps {
  activeTab: ActiveTab;
  usersCount: number;
  profilesCount: number;
  onTabChange: (tab: ActiveTab) => void;
}

export function UsersTabs({
  activeTab,
  usersCount,
  profilesCount,
  onTabChange,
}: UsersTabsProps) {
  return (
    <div className="flex items-center gap-1">
      <TabButton
        active={activeTab === "users"}
        onClick={() => onTabChange("users")}
        label="Usuarios"
        count={usersCount}
      />
      <TabButton
        active={activeTab === "profiles"}
        onClick={() => onTabChange("profiles")}
        label="Perfis"
        count={profilesCount}
      />
    </div>
  );
}
