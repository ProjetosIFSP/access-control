import type { BlockFormValues } from "@/components/blocks/block-form-panel";
import { BlockFormPanel } from "@/components/blocks/block-form-panel";
import type { RoomTypeFormValues } from "@/components/room-types/room-type-form-panel";
import { RoomTypeFormPanel } from "@/components/room-types/room-type-form-panel";
import type { RoomFormValues } from "@/components/rooms-admin/room-form-panel";
import { RoomFormPanel } from "@/components/rooms-admin/room-form-panel";
import { SplitViewPanel } from "@/components/ui/split-view";
import { SplitViewPanelHeader } from "@/components/ui/split-view-panel-header";
import type { BlockSummary, RoomType } from "@/services/rooms/types";

import type { PanelMode } from "./-types";

interface RoomsSidePanelProps {
	panelMode: PanelMode;
	panelTitle: string;
	panelSubtitle: string;
	allBlocks: BlockSummary[];
	roomTypes: RoomType[];
	onClose: () => void;
	// Room form
	isSubmittingRoom: boolean;
	onSubmitRoom: (values: RoomFormValues) => void;
	// Block form
	isSubmittingBlock: boolean;
	onSubmitBlock: (values: BlockFormValues) => void;
	// RoomType form
	isSubmittingRoomType: boolean;
	onSubmitRoomType: (values: RoomTypeFormValues) => void;
}

export function RoomsSidePanel({
	panelMode,
	panelTitle,
	panelSubtitle,
	allBlocks,
	roomTypes,
	onClose,
	isSubmittingRoom,
	onSubmitRoom,
	isSubmittingBlock,
	onSubmitBlock,
	isSubmittingRoomType,
	onSubmitRoomType,
}: RoomsSidePanelProps) {
	const roomFormOpen =
		panelMode.kind === "createRoom" || panelMode.kind === "editRoom";
	const editRoom = panelMode.kind === "editRoom" ? panelMode.item : null;

	const blockFormOpen =
		panelMode.kind === "createBlock" || panelMode.kind === "editBlock";
	const editBlock = panelMode.kind === "editBlock" ? panelMode.item : null;

	const roomTypeFormOpen =
		panelMode.kind === "createRoomType" || panelMode.kind === "editRoomType";
	const editRoomType =
		panelMode.kind === "editRoomType" ? panelMode.item : null;

	return (
		<SplitViewPanel className="flex flex-col">
			<SplitViewPanelHeader
				title={panelTitle}
				subtitle={panelSubtitle}
				onClose={onClose}
			/>
			<div className="flex-1 overflow-y-auto py-6">
				{(roomFormOpen || editRoom) && (
					<RoomFormPanel
						room={editRoom}
						blocks={allBlocks}
						roomTypes={roomTypes}
						isSubmitting={isSubmittingRoom}
						onSubmit={onSubmitRoom}
						onCancel={onClose}
					/>
				)}
				{(blockFormOpen || editBlock) && (
					<BlockFormPanel
						block={editBlock}
						isSubmitting={isSubmittingBlock}
						onSubmit={onSubmitBlock}
						onCancel={onClose}
					/>
				)}
				{(roomTypeFormOpen || editRoomType) && (
					<RoomTypeFormPanel
						roomType={editRoomType}
						isSubmitting={isSubmittingRoomType}
						onSubmit={onSubmitRoomType}
						onCancel={onClose}
					/>
				)}
			</div>
		</SplitViewPanel>
	);
}
