import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	SplitView,
	SplitViewMain,
	SplitViewPanel,
} from "@/components/ui/split-view";
import { useControllerStream } from "@/hooks/use-controller-stream";
import { useDebounce } from "@/hooks/use-debounce";
import { useMqttNfcReader } from "@/hooks/use-mqtt-nfc-reader";
import { nfcCredentialsQueryOptions } from "@/services/credentials";
import { controllerTargetsQueryOptions } from "@/services/doors";
import {
	configQueryKeys,
	controllersQueryOptions,
	deleteController,
	putController,
} from "@/services/iot";
import { ConfigDialogs } from "./-dialogs";
import { ConfigControllerForm } from "./-form";
import { ConfigHeader } from "./-header";
import { TabControllers } from "./-tab-controllers";
import { TabCredentials } from "./-tab-credentials";
import { ConfigTabs } from "./-tabs";
import { ConfigToolbar } from "./-toolbar";
import type { IotController } from "./-types";
import { configSearchParams } from "./-types";

export const Route = createFileRoute("/config/")({
	beforeLoad: () => {
		if (typeof document === "undefined") return;
	},
	loader: ({ context }) => {
		if (typeof document === "undefined") return Promise.resolve();
		return Promise.all([
			context.queryClient.ensureQueryData(controllersQueryOptions),
			context.queryClient.ensureQueryData(controllerTargetsQueryOptions),
		]);
	},
	component: ConfigManagePage,
});

function ConfigManagePage() {
	const { data } = useSuspenseQuery(controllersQueryOptions);
	const [params, setParams] = useQueryStates(configSearchParams, {
		history: "replace",
		shallow: false,
		clearOnDefault: true,
	});

	const activeTab = params.tab;

	// Global Search Logic
	const [searchQuery, setSearchQuery] = useState(params.q ?? "");
	const debouncedQuery = useDebounce(searchQuery, 400);

	useEffect(() => {
		setParams({ q: debouncedQuery.trim() || null, page: 1 });
	}, [debouncedQuery, setParams]);

	useEffect(() => {
		setSearchQuery(params.q ?? "");
	}, [params.q]);

	const [isAddControllerOpen, setIsAddControllerOpen] = useState(false);

	const liveControllers = useControllerStream();
	const [nowTick, setNowTick] = useState(Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNowTick(Date.now()), 15000);
		return () => clearInterval(timer);
	}, []);

	const filteredControllers = (data?.controllers ?? [])
		.map((c) => {
			const live = liveControllers[c.id];
			if (live) {
				return {
					...c,
					isOnline: true,
					lastSeenAt: live.lastSeenAt,
					roomId: live.roomId ?? c.roomId,
					sensorProtocol: live.sensorProtocol ?? c.sensorProtocol,
				};
			}
			return c;
		})
		.map((c) => {
			const isActuallyOnline =
				nowTick - new Date(c.lastSeenAt).getTime() < 45000;
			return { ...c, isOnline: isActuallyOnline };
		})
		.filter(
			(c) =>
				c.id.toLowerCase().includes((searchQuery ?? "").toLowerCase()) ||
				(c.roomId?.toLowerCase() ?? "").includes(
					(searchQuery ?? "").toLowerCase(),
				),
		);

	// NFC Reader Logic for Credentials Tab
	const { data: targetsData } = useQuery(controllerTargetsQueryOptions);
	const doorControllers = targetsData?.roomControllers ?? [];
	const [selectedControllerId, setSelectedControllerId] =
		useState<string>("none");
	const [pairedTag, setPairedTag] = useState<string | null>(null);

	const { data: nfcData } = useQuery(
		nfcCredentialsQueryOptions({ q: params.q, page: params.page }),
	);
	const credentialsCount = nfcData?.total ?? 0;

	const {
		status: nfcStatus,
		startCapture,
		cancelCapture,
	} = useMqttNfcReader({
		controllerId: selectedControllerId !== "none" ? selectedControllerId : null,
		onUidReceived: useCallback((uid: string) => {
			setPairedTag(uid);
			setSearchQuery(uid);
		}, []),
	});

	const handleActionOnlinePairing = () => {
		if (selectedControllerId === "none") {
			toast.error("Selecione um leitor antes de iniciar!");
			return;
		}
		setPairedTag(null);
		startCapture();
	};

	const [editTarget, setEditTarget] = useState<IotController | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<IotController | null>(null);
	const queryClient = useQueryClient();

	const putMut = useMutation({
		mutationFn: putController,
		onSuccess: () => {
			toast.success("Controlador atualizado com sucesso!");
			queryClient.invalidateQueries({ queryKey: configQueryKeys.controllers });
		},
		onError: () => toast.error("Erro ao atualizar o controlador."),
	});

	const delMut = useMutation({
		mutationFn: async () => {
			if (deleteTarget) {
				await deleteController(deleteTarget.id);
			}
		},
		onSuccess: () => {
			toast.success("Controlador deletado com sucesso!");
			setDeleteTarget(null);
			queryClient.invalidateQueries({ queryKey: configQueryKeys.controllers });
		},
		onError: () => toast.error("Erro ao deletar o controlador."),
	});

	return (
		<>
			<main className="flex w-full flex-1 flex-col overflow-hidden px-4 sm:px-8 md:px-16 lg:px-32 transition-all py-8">
				<SplitView
					open={editTarget !== null}
					onOpenChange={(open) => !open && setEditTarget(null)}
				>
					<SplitViewMain>
						<div className="flex flex-col gap-6">
							<ConfigHeader />

							<ConfigTabs
								activeTab={activeTab}
								onTabChange={(tab) => {
									setSearchQuery("");
									setPairedTag(null);
									cancelCapture();
									setParams({ tab, q: null, page: 1 });
								}}
								controllersCount={data?.controllers?.length ?? 0}
								credentialsCount={credentialsCount}
							/>

							<ConfigToolbar
								activeTab={activeTab}
								searchValue={searchQuery}
								onSearchChange={setSearchQuery}
								onAddController={() => setIsAddControllerOpen(true)}
								doorControllers={doorControllers}
								selectedControllerId={selectedControllerId}
								onSelectedControllerChange={setSelectedControllerId}
								nfcStatus={nfcStatus}
								onStartCapture={handleActionOnlinePairing}
								onCancelCapture={cancelCapture}
							/>

							<div className="flex-1 overflow-auto rounded-lg">
								{activeTab === "controllers" && (
									<TabControllers
										controllers={filteredControllers}
										onEdit={setEditTarget}
										onDelete={setDeleteTarget}
									/>
								)}
								{activeTab === "credentials" && (
									<TabCredentials
										pairedTag={pairedTag}
										setPairedTag={setPairedTag}
									/>
								)}
							</div>
						</div>
					</SplitViewMain>
					<SplitViewPanel>
						<div className="flex h-full flex-col p-6 overflow-auto">
							<h2 className="text-xl font-bold mb-4">Editar Controlador</h2>
							<ConfigControllerForm
								key={editTarget?.id ?? "empty"}
								controller={editTarget}
								mutation={putMut}
								onSuccess={() => setEditTarget(null)}
								onCancel={() => setEditTarget(null)}
							/>
						</div>
					</SplitViewPanel>
				</SplitView>
			</main>

			<ConfigDialogs
				isAddControllerOpen={isAddControllerOpen}
				onAddControllerChange={setIsAddControllerOpen}
				deleteTarget={deleteTarget}
				onDeleteOpenChange={(open) => !open && setDeleteTarget(null)}
				isDeleting={delMut.isPending}
				onConfirmDelete={() => delMut.mutate()}
			/>
		</>
	);
}
