import { BlockDeleteDialog } from "@/components/blocks/block-delete-dialog";
import { RoomTypeDeleteDialog } from "@/components/room-types/room-type-delete-dialog";
import { RoomDeleteDialog } from "@/components/rooms-admin/room-delete-dialog";
import type { BlockSummary, RoomSummaryAdmin, RoomType } from "@/services/rooms/types";

interface RoomsDialogsProps {
  // Room delete
  deleteRoomTarget: RoomSummaryAdmin | null;
  onDeleteRoomOpenChange: (open: boolean) => void;
  isDeletingRoom: boolean;
  onConfirmDeleteRoom: () => void;
  // Block delete
  deleteBlockTarget: BlockSummary | null;
  onDeleteBlockOpenChange: (open: boolean) => void;
  isDeletingBlock: boolean;
  onConfirmDeleteBlock: () => void;
  // RoomType delete
  deleteRoomTypeTarget: RoomType | null;
  onDeleteRoomTypeOpenChange: (open: boolean) => void;
  isDeletingRoomType: boolean;
  onConfirmDeleteRoomType: () => void;
}

export function RoomsDialogs({
  deleteRoomTarget,
  onDeleteRoomOpenChange,
  isDeletingRoom,
  onConfirmDeleteRoom,
  deleteBlockTarget,
  onDeleteBlockOpenChange,
  isDeletingBlock,
  onConfirmDeleteBlock,
  deleteRoomTypeTarget,
  onDeleteRoomTypeOpenChange,
  isDeletingRoomType,
  onConfirmDeleteRoomType,
}: RoomsDialogsProps) {
  return (
    <>
      <RoomDeleteDialog
        open={deleteRoomTarget !== null}
        onOpenChange={onDeleteRoomOpenChange}
        room={deleteRoomTarget}
        isDeleting={isDeletingRoom}
        onConfirm={onConfirmDeleteRoom}
      />

      <BlockDeleteDialog
        open={deleteBlockTarget !== null}
        onOpenChange={onDeleteBlockOpenChange}
        block={deleteBlockTarget}
        isDeleting={isDeletingBlock}
        onConfirm={onConfirmDeleteBlock}
      />

      <RoomTypeDeleteDialog
        open={deleteRoomTypeTarget !== null}
        onOpenChange={onDeleteRoomTypeOpenChange}
        roomType={deleteRoomTypeTarget}
        isDeleting={isDeletingRoomType}
        onConfirm={onConfirmDeleteRoomType}
      />
    </>
  );
}
