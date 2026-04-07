import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Trash } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import {
	deleteNfcCredential,
	nfcCredentialsQueryOptions,
} from "@/services/credentials";

const paramsSchema = {
	q: parseAsString,
	page: parseAsInteger.withDefault(1),
};

export function TabCredentials({
	pairedTag,
	setPairedTag,
}: {
	pairedTag: string | null;
	setPairedTag: (val: string | null) => void;
}) {
	const queryClient = useQueryClient();
	const [params] = useQueryStates(paramsSchema, {
		history: "replace",
		shallow: false,
		clearOnDefault: true,
	});

	// A busca já vem do Toolbar no index
	const debouncedInput = useDebounce(params.q ?? "", 400);

	// Delete state
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const deleteMutation = useMutation({
		mutationFn: deleteNfcCredential,
		onSuccess: () => {
			toast.success("Credencial apagada com sucesso!");
			queryClient.invalidateQueries({ queryKey: ["credentials"] });
			setDeleteTargetId(null);
		},
		onError: (err) => {
			toast.error(`Falha ao apagar credencial: ${err.message}`);
		},
	});

	// List NFCs
	const { data, isLoading } = useQuery(
		nfcCredentialsQueryOptions({
			q: debouncedInput.trim() || undefined,
			page: params.page,
		}),
	);

	return (
		<div className="flex flex-col gap-6 p-1 overflow-hidden h-full">
			{/* List */}
			<div className="rounded-lg border bg-white dark:bg-zinc-950 overflow-auto flex-1">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Identificador (UID)</TableHead>
							<TableHead>Usuário Vinculado</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Última Utilização</TableHead>
							<TableHead className="w-20"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={5} className="h-24 text-center">
									Carregando...
								</TableCell>
							</TableRow>
						) : data?.result.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="h-24 text-center text-zinc-500 dark:text-zinc-400"
								>
									Nenhuma credencial NFC encontrada.
								</TableCell>
							</TableRow>
						) : (
							data?.result.map((cred) => (
								<TableRow
									key={cred.id}
									className={
										pairedTag === cred.value
											? "bg-primary/5 dark:bg-primary/10"
											: ""
									}
								>
									<TableCell className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
										{cred.value}
									</TableCell>
									<TableCell>
										{cred.user ? (
											<Link
												to={`/users`}
												search={{
													q: cred.user.name,
													profileIds: [],
													tab: "users",
													page: 1,
												}}
												className="hover:underline text-blue-600 dark:text-blue-400"
											>
												{cred.user.name}
											</Link>
										) : (
											<span className="text-zinc-500 dark:text-zinc-400 italic">
												Desvinculado
											</span>
										)}
									</TableCell>
									<TableCell>
										{cred.isActive ? (
											<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100/50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
												Ativa
											</span>
										) : (
											<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
												Inativa
											</span>
										)}
									</TableCell>
									<TableCell className="text-zinc-500 dark:text-zinc-400">
										{cred.lastUsage
											? new Intl.DateTimeFormat("pt-BR", {
													dateStyle: "short",
													timeStyle: "short",
												}).format(new Date(cred.lastUsage))
											: "-"}
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="icon-xs"
											className="text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-red-950/30"
											onClick={() => setDeleteTargetId(cred.id)}
										>
											<Trash className="size-3.5" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Delete Dialog */}
			<AlertDialog
				open={!!deleteTargetId}
				onOpenChange={(open) => !open && setDeleteTargetId(null)}
			>
				<AlertDialogContent className="dark:bg-zinc-950 dark:border-zinc-800">
					<AlertDialogHeader>
						<AlertDialogTitle>Remover credencial NFC?</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja apagar permanentemente esta tag NFC? O
							usuário (caso haja) perderá imediatamente o acesso utilizando esta
							tag.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="dark:border-zinc-800 dark:hover:bg-zinc-900">
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-red-600 hover:bg-red-700 text-white"
							disabled={deleteMutation.isPending}
							onClick={(e) => {
								e.preventDefault();
								if (deleteTargetId) deleteMutation.mutate(deleteTargetId);
							}}
						>
							{deleteMutation.isPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Remover
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog open={!!pairedTag} onOpenChange={(o) => !o && setPairedTag(null)}>
				<DialogContent className="dark:bg-zinc-950 dark:border-zinc-800">
					<DialogHeader>
						<DialogTitle>Tag Detectada</DialogTitle>
						<DialogDescription>
							A tag NFC de UID {pairedTag} foi detectada pelo leitor. A lista já
							foi filtrada para mostrá-la, caso exista no sistema.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end pt-4">
						<Button onClick={() => setPairedTag(null)}>Fechar</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
