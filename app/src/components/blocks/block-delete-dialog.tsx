import { CrudDeleteDialog } from "@/components/ui/crud-delete-dialog";
import type { BlockSummary } from "@/services/rooms/types";

interface BlockDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	block: BlockSummary | null;
	isDeleting: boolean;
	onConfirm: () => void;
}

export function BlockDeleteDialog({
	open,
	onOpenChange,
	block,
	isDeleting,
	onConfirm,
}: BlockDeleteDialogProps) {
	return (
		<CrudDeleteDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Excluir bloco"
			description={
				<>
					Tem certeza que deseja excluir o bloco{" "}
					<strong className="text-foreground">{block?.name ?? ""}</strong>? Essa
					acao nao pode ser desfeita. O bloco so pode ser excluido se nao houver
					salas associadas a ele.
				</>
			}
			isDeleting={isDeleting}
			onConfirm={onConfirm}
		/>
	);
}
