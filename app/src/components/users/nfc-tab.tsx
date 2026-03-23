import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, X, Nfc } from "lucide-react";
import { useState, useEffect } from "react";
import { useNfcReader } from "@/hooks/use-nfc-reader";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	nfcTagQueryKeys,
	registerNfcTag,
	userNfcTagsQueryOptions,
} from "@/services/users/nfc-tags";

interface NfcTabProps {
	user: { id: string; name: string };
}

export function NfcTab({ user }: NfcTabProps) {
	const queryClient = useQueryClient();

	const nfcQuery = useQuery(userNfcTagsQueryOptions(user.id));
	const nfcTags = nfcQuery.data ?? [];

	const [deleteId, setDeleteId] = useState<string | null>(null);

	const registerMutation = useMutation({
		mutationFn: registerNfcTag,
		onSuccess: () => {
			toast.success("Cartão NFC cadastrado com sucesso", {
				description: "O cartão já pode ser usado para acesso.",
			});
			queryClient.invalidateQueries({
				queryKey: nfcTagQueryKeys.list(user.id),
			});
		},
		onError: (error) => {
			toast.error("Erro ao cadastrar cartão", {
				description: error.message,
			});
		},
	});

	const { mutate: deleteMutate } = useMutation({
		mutationFn: async (credentialId: string) => {
			setDeleteId(credentialId);
			const { deleteNfcTag } = await import("@/services/users/nfc-tags");
			return deleteNfcTag({ userId: user.id, credentialId });
		},
		onSuccess: () => {
			toast.success("Cartão NFC removido.");
			queryClient.invalidateQueries({
				queryKey: nfcTagQueryKeys.list(user.id),
			});
		},
		onError: (error) => {
			toast.error("Erro ao remover cartão", {
				description: error.message,
			});
		},
		onSettled: () => setDeleteId(null),
	});

	const {
		status: readerStatus,
		lastUid,
		startCapture,
		cancelCapture,
	} = useNfcReader();

	const isReading = readerStatus === "waiting" || readerStatus === "reading";

	// Quando o UID é lido com sucesso, cadastra
	useEffect(() => {
		if (readerStatus === "success" && lastUid) {
			registerMutation.mutate({ userId: user.id, value: lastUid });
			cancelCapture();
		}
	}, [readerStatus, lastUid, registerMutation, user.id, cancelCapture]);

	const handleReadNfc = () => {
		startCapture();
	};

	const handleCancelRead = () => {
		cancelCapture();
	};

	return (
		<div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
			<div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center text-center gap-4">
				<div
					className={cn(
						"h-16 w-16 rounded-full flex items-center justify-center transition-colors",
						isReading
							? "bg-primary/20 text-primary animate-pulse"
							: "bg-muted text-muted-foreground",
					)}
				>
					<Nfc className="h-8 w-8" />
				</div>
				<div className="space-y-1">
					<h3 className="font-medium text-lg">Cadastro de Cartão NFC</h3>
					<p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
						{isReading
							? "Aproxime o cartão do leitor..."
							: "Clique no botão abaixo e aproxime o cartão do leitor NFC."}
					</p>
				</div>
				{!isReading ? (
					<Button
						size="lg"
						className="w-full max-w-[200px]"
						disabled={registerMutation.isPending}
						onClick={handleReadNfc}
					>
						Ler Cartão NFC
					</Button>
				) : (
					<Button
						size="lg"
						variant="secondary"
						className="w-full max-w-[200px]"
						onClick={handleCancelRead}
					>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Aguardando leitura... (Cancelar)
					</Button>
				)}
			</div>

			<div className="space-y-3">
				<h4 className="text-sm font-medium flex justify-between items-center px-1">
					<span>Cartões Cadastrados</span>
					<span className="text-muted-foreground">{nfcTags.length} / 5</span>
				</h4>

				{nfcQuery.isLoading ? (
					<div className="h-24 flex items-center justify-center border rounded-xl border-dashed">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : nfcTags.length === 0 ? (
					<div className="h-24 flex items-center justify-center border rounded-xl border-dashed bg-muted/30 text-muted-foreground text-sm">
						Nenhum cartão cadastrado.
					</div>
				) : (
					<div className="grid gap-2">
						{nfcTags.map((tag) => (
							<div
								key={tag.id}
								className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-sm"
							>
								<div className="flex items-center gap-3">
									<div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
										<Nfc className="h-4 w-4 text-primary" />
									</div>
									<div className="flex flex-col">
										<span className="text-sm font-medium capitalize flex items-center gap-2">
											Cartão NFC
										</span>
										<span className="text-xs text-muted-foreground font-mono">
											UID: {tag.value}
										</span>
									</div>
								</div>

								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
									disabled={deleteId === tag.id}
									onClick={() => deleteMutate(tag.id)}
									aria-label={"Remover cartão"}
								>
									{deleteId === tag.id ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<X className="h-4 w-4" />
									)}
								</Button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
