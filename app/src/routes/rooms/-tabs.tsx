import { TabButton } from "@/components/ui/tab-button";

import type { ActiveTab } from "./-types";

interface RoomsTabsProps {
	activeTab: ActiveTab;
	onTabChange: (tab: ActiveTab) => void;
	roomsCount: number;
	blocksCount: number;
	typesCount: number;
}

export function RoomsTabs({
	activeTab,
	onTabChange,
	roomsCount,
	blocksCount,
	typesCount,
}: RoomsTabsProps) {
	return (
		<div className="flex items-center gap-1">
			<TabButton
				active={activeTab === "rooms"}
				onClick={() => onTabChange("rooms")}
				label="Salas"
				count={roomsCount}
			/>
			<TabButton
				active={activeTab === "blocks"}
				onClick={() => onTabChange("blocks")}
				label="Blocos"
				count={blocksCount}
			/>
			<TabButton
				active={activeTab === "types"}
				onClick={() => onTabChange("types")}
				label="Tipos"
				count={typesCount}
			/>
		</div>
	);
}
