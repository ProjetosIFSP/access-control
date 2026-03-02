import { CrudDeleteDialog } from "@/components/ui/crud-delete-dialog";

interface UserDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function UserDeleteDialog({
  open,
  onOpenChange,
  userName,
  isDeleting,
  onConfirm,
}: UserDeleteDialogProps) {
  return (
    <CrudDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir usuario"
      description={
        <>
          Tem certeza que deseja excluir o usuario{" "}
          <strong className="text-foreground">{userName}</strong>? Essa acao nao
          pode ser desfeita. Todas as sessoes, contas vinculadas e credenciais
          do usuario serao removidas permanentemente.
        </>
      }
      isDeleting={isDeleting}
      onConfirm={onConfirm}
    />
  );
}
