import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CrudDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Titulo do dialog, ex: "Excluir usuario" */
  title: string;
  /** Descricao/corpo do dialog. Pode ser uma string simples ou um ReactNode. */
  description: ReactNode;
  isDeleting: boolean;
  onConfirm: () => void;
  /** Texto do botao de confirmacao (padrao: "Excluir") */
  confirmLabel?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CrudDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  isDeleting,
  onConfirm,
  confirmLabel = "Excluir",
}: CrudDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <span>{description}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
