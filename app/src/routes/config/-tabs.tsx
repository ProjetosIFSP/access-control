import { TabButton } from "@/components/ui/tab-button";
import type { ConfigActiveTab } from "./-types";

interface ConfigTabsProps {
	activeTab: ConfigActiveTab;
	onTabChange: (tab: ConfigActiveTab) => void;
	controllersCount: number;
	credentialsCount: number;
}

export function ConfigTabs({
	activeTab,
	onTabChange,
	controllersCount,
	credentialsCount,
}: ConfigTabsProps) {
	return (
		<div className="flex items-center gap-1">
			<TabButton
				active={activeTab === "controllers"}
				onClick={() => onTabChange("controllers")}
				label="Controladores"
				count={controllersCount}
			/>
			<TabButton
				active={activeTab === "credentials"}
				onClick={() => onTabChange("credentials")}
				label="Credenciais"
				count={credentialsCount}
			/>
		</div>
	);
}
