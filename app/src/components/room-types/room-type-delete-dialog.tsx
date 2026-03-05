import { CrudDeleteDialog } from "@/components/ui/crud-delete-dialog";
import type { RoomType } from "@/services/rooms/types";

interface RoomTypeDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	roomType: RoomType | null;
	isDeleting: boolean;
	onConfirm: () => void;
}

export function RoomTypeDeleteDialog({
	open,
	onOpenChange,
	roomType,
	isDeleting,
	onConfirm,
}: RoomTypeDeleteDialogProps) {
	return (
		<CrudDeleteDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Excluir tipo de sala"
			description={
				<>
					Tem certeza que deseja excluir o tipo{" "}
					<strong className="text-foreground">{roomType?.name ?? ""}</strong>?
					Essa acao nao pode ser desfeita. O tipo so pode ser excluido se nao
					houver salas associadas a ele.
				</>
			}
			isDeleting={isDeleting}
			onConfirm={onConfirm}
		/>
	);
}
