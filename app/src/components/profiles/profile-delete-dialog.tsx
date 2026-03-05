import { CrudDeleteDialog } from "@/components/ui/crud-delete-dialog";
import type { ProfileSummary } from "@/services/profiles/types";

interface ProfileDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	profile: ProfileSummary | null;
	isDeleting: boolean;
	onConfirm: () => void;
}

export function ProfileDeleteDialog({
	open,
	onOpenChange,
	profile,
	isDeleting,
	onConfirm,
}: ProfileDeleteDialogProps) {
	return (
		<CrudDeleteDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Excluir perfil"
			description={
				<>
					Tem certeza que deseja excluir o perfil{" "}
					<strong className="text-foreground">{profile?.name ?? ""}</strong>?
					Essa acao nao pode ser desfeita. Todos os usuarios e salas associados
					a este perfil perderao as permissoes concedidas por ele.
				</>
			}
			isDeleting={isDeleting}
			onConfirm={onConfirm}
		/>
	);
}
