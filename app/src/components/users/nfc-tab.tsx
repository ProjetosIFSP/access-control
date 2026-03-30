import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Nfc, X } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMqttNfcReader } from "@/hooks/use-mqtt-nfc-reader";
import { useNfcReader } from "@/hooks/use-nfc-reader";
import { cn } from "@/lib/utils";
import {
	formatUid,
	normalizeUid,
} from "@/lib/nfc";
import {
	nfcTagQueryKeys,
	registerNfcTag,
	userNfcTagsQueryOptions,
} from "@/services/users/nfc-tags";

interface NfcTabProps {
	user: { id: string; name: string };
	/** ID do dispositivo RC522 selecionado no selector acima das tabs. null = usar leitor HID/USB. */
	selectedControllerId: string | null;
}

export function NfcTab({ user, selectedControllerId }: NfcTabProps) {
	const queryClient = useQueryClient();

	// ── Tags cadastradas ─────────────────────────────────────────────────────────
	const nfcQuery = useQuery(userNfcTagsQueryOptions(user.id));
	const nfcTags = nfcQuery.data ?? [];

	// ── Mutação de cadastro ─────────────────────────────────────────────────────
	const registerMutation = useMutation({
		mutationFn: registerNfcTag,
		onSuccess: (_data, variables) => {
			const wasMqttEnroll = !!variables.enrolledByControllerId;
			toast.success("Cartão NFC cadastrado com sucesso", {
				description: wasMqttEnroll
					? "O terminal RC522 gravou os dados de segurança no cartão."
					: "O cartão já pode ser usado para acesso.",
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
	});

	// ── Modo MQTT via SSE (RC522 físico) ────────────────────────────────────────
	const mqttReader = useMqttNfcReader({
		controllerId: selectedControllerId,
		onUidReceived: (uid) => {
			registerMutation.mutate({
				userId: user.id,
				value: normalizeUid(uid),
				enrolledByControllerId: selectedControllerId ?? undefined,
			});
		},
	});

	// ── Modo HID / teclado (leitor USB) ─────────────────────────────────────────
	const hidReader = useNfcReader();

	// biome-ignore lint/correctness/useExhaustiveDependencies: stable refs
	useEffect(() => {
		if (hidReader.status === "success" && hidReader.lastUid) {
			registerMutation.mutate({
				userId: user.id,
				value: normalizeUid(hidReader.lastUid),
				enrolledByControllerId: undefined,
			});
			hidReader.cancelCapture();
		}
	}, [hidReader.status, hidReader.lastUid]);

	// ── Estado unificado ─────────────────────────────────────────────────────────
	const useMqttMode = !!selectedControllerId;

	const isReading =
		(useMqttMode &&
			(mqttReader.status === "connecting" || mqttReader.status === "waiting")) ||
		(!useMqttMode &&
			(hidReader.status === "waiting" || hidReader.status === "reading"));

	const handleStartRead = () => {
		if (useMqttMode) mqttReader.startCapture();
		else hidReader.startCapture();
	};

	const handleCancelRead = () => {
		if (useMqttMode) mqttReader.cancelCapture();
		else hidReader.cancelCapture();
	};

	const readingLabel =
		useMqttMode && mqttReader.status === "connecting"
			? "Conectando ao leitor..."
			: useMqttMode
				? "Aguardando leitura no dispositivo físico..."
				: "Aproxime o cartão do leitor USB...";

	const idleLabel = useMqttMode
		? "Clique em Ler Cartão e aproxime o cartão do RC522 selecionado."
		: "Clique no botão abaixo e aproxime o cartão do leitor NFC USB.";

	return (
		<div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">

			{/* ── Área de captura ────────────────────────────────────────────── */}
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
						{isReading ? readingLabel : idleLabel}
					</p>
				</div>
				{!isReading ? (
					<Button
						size="lg"
						className="w-full max-w-50"
						disabled={registerMutation.isPending}
						onClick={handleStartRead}
					>
						Ler Cartão NFC
					</Button>
				) : (
					<Button
						size="lg"
						variant="secondary"
						className="w-full max-w-50"
						onClick={handleCancelRead}
					>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Aguardando... (Cancelar)
					</Button>
				)}
			</div>

			{/* ── Lista de cartões cadastrados ───────────────────────────────── */}
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
									<div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
										<Nfc className="h-4 w-4 text-primary" />
									</div>
									<div className="flex flex-col min-w-0">
										<span className="text-sm font-medium">Cartão NFC</span>
										<span className="text-xs text-muted-foreground font-mono truncate">
											UID: {formatUid(tag.value)}
										</span>
									</div>
								</div>

								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
									onClick={() => deleteMutate(tag.id)}
									aria-label="Remover cartão"
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
