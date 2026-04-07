import { CrudDeleteDialog } from "@/components/ui/crud-delete-dialog";
import type { IotController } from "@/routes/config/-types";

interface ControllerDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	controller: IotController | null;
	isDeleting: boolean;
	onConfirm: () => void;
}

export function ControllerDeleteDialog({
	open,
	onOpenChange,
	controller,
	isDeleting,
	onConfirm,
}: ControllerDeleteDialogProps) {
	return (
		<CrudDeleteDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Excluir controlador"
			description={
				<>
					Tem certeza que deseja excluir o controlador{" "}
					<strong className="text-foreground">{controller?.id ?? ""}</strong>?
					Essa ação não pode ser desfeita. O controlador será desvinculado de
					todas as salas e os comandos MQTT associados não serão mais
					processados.
				</>
			}
			isDeleting={isDeleting}
			onConfirm={onConfirm}
		/>
	);
}
