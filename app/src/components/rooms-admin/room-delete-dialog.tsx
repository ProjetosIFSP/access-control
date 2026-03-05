import { CrudDeleteDialog } from "@/components/ui/crud-delete-dialog";
import type { RoomSummaryAdmin } from "@/services/rooms/types";

interface RoomDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	room: RoomSummaryAdmin | null;
	isDeleting: boolean;
	onConfirm: () => void;
}

export function RoomDeleteDialog({
	open,
	onOpenChange,
	room,
	isDeleting,
	onConfirm,
}: RoomDeleteDialogProps) {
	return (
		<CrudDeleteDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Excluir sala"
			description={
				<>
					Tem certeza que deseja excluir a sala{" "}
					<strong className="text-foreground">{room?.name ?? ""}</strong>? Essa
					acao nao pode ser desfeita. Todas as permissoes e logs associados a
					sala serao removidos permanentemente.
				</>
			}
			isDeleting={isDeleting}
			onConfirm={onConfirm}
		/>
	);
}
