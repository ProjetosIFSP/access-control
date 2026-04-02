import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useControllerStream } from "@/hooks/use-controller-stream";
import { toast } from "sonner";

import { SplitView, SplitViewMain } from "@/components/ui/split-view";
import { useDebounce } from "@/hooks/use-debounce";
import { controllerTargetsQueryOptions } from "@/services/doors";
import { profilesQueryOptions } from "@/services/profiles";
import type { RoomsAdminFilters } from "@/services/rooms";
import {
	blocksQueryOptions,
	createBlock,
	createRoom,
	createRoomType,
	deleteBlock,
	deleteRoom,
	deleteRoomType,
	roomRelationsQueryOptions,
	roomsAdminQueryOptions,
	roomsQueryKeys,
	roomTypesQueryOptions,
	updateBlock,
	updateRoom,
	updateRoomType,
} from "@/services/rooms";
import type {
	BlockSummary,
	RoomSummaryAdmin,
	RoomType,
} from "@/services/rooms/types";
import { currentUserQueryOptions } from "@/services/users";

import { RoomsDialogs } from "./-dialogs";
import { RoomsHeader } from "./-header";
import { RoomsSidePanel } from "./-side-panel";
import { TabBlocks } from "./-tab-blocks";
import { TabRooms } from "./-tab-rooms";

import { TabRoomTypes } from "./-tab-types";
import { RoomsTabs } from "./-tabs";
import { RoomsToolbar } from "./-toolbar";
import type { ActiveTab, PanelMode } from "./-types";
import { PAGE_SIZE, roomsSearchParams } from "./-types";

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/rooms/")({
	beforeLoad: async ({ context }) => {
		if (typeof document === "undefined") return;
		try {
			const me = await context.queryClient.ensureQueryData(
				currentUserQueryOptions,
			);
			if (!me?.isAdmin)
				throw redirect({
					to: "/",
					search: { q: undefined, type: undefined, state: undefined },
				});
		} catch (e) {
			if (e && typeof e === "object" && "to" in e) throw e;
			throw redirect({
				to: "/",
				search: { q: undefined, type: undefined, state: undefined },
			});
		}
	},
	loader: ({ context }) => {
		if (typeof document === "undefined") return Promise.resolve();
		return Promise.all([
			context.queryClient.ensureQueryData(roomsAdminQueryOptions({ page: 1 })),
			context.queryClient.ensureQueryData(blocksQueryOptions),
			context.queryClient.ensureQueryData(roomTypesQueryOptions),
			context.queryClient.ensureQueryData(profilesQueryOptions),
			context.queryClient.ensureQueryData(controllerTargetsQueryOptions),
		]);
	},
	component: RoomsManagePage,
});

// ── Component ─────────────────────────────────────────────────────────────────

function RoomsManagePage() {
	const queryClient = useQueryClient();

	// ── URL state (nuqs) ────────────────────────────────────────────────────────
	const [params, setParams] = useQueryStates(roomsSearchParams, {
		history: "replace",
		shallow: false,
		clearOnDefault: true,
	});

	const {
		q,
		tab: activeTab,
		typeIds: paramTypeIds,
		blockIds: paramBlockIds,
		page: currentPage,
	} = params;

	// ── Search input ────────────────────────────────────────────────────────────
	const [inputValue, setInputValue] = useState(q);
	const debouncedInput = useDebounce(inputValue, 500);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setParams({ q: debouncedInput.trim() || "", page: null });
	}, [debouncedInput, setParams]);

	useEffect(() => {
		setInputValue(q);
	}, [q]);

	// ── Filter state ────────────────────────────────────────────────────────────
	const selectedTypeId = paramTypeIds[0] ?? "all";
	const selectedBlockId = paramBlockIds[0] ?? "all";

	const setSelectedTypeId = useCallback(
		(id: string) => setParams({ typeIds: id !== "all" ? [id] : [], page: 1 }),
		[setParams],
	);

	const setSelectedBlockId = useCallback(
		(id: string) => setParams({ blockIds: id !== "all" ? [id] : [], page: 1 }),
		[setParams],
	);

	// ── Panel state ─────────────────────────────────────────────────────────────
	const [nowTick, setNowTick] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNowTick(Date.now()), 15000);
		return () => clearInterval(timer);
	}, []);

	const [panelMode, setPanelMode] = useState<PanelMode>({ kind: "none" });
	const panelVisible = panelMode.kind !== "none";

	const openCreateRoom = useCallback(
		() => setPanelMode({ kind: "createRoom" }),
		[],
	);
	const openEditRoom = useCallback(
		(room: RoomSummaryAdmin) => setPanelMode({ kind: "editRoom", item: room }),
		[],
	);
	const openCreateBlock = useCallback(
		() => setPanelMode({ kind: "createBlock" }),
		[],
	);
	const openEditBlock = useCallback(
		(block: BlockSummary) => setPanelMode({ kind: "editBlock", item: block }),
		[],
	);
	const openCreateRoomType = useCallback(
		() => setPanelMode({ kind: "createRoomType" }),
		[],
	);
	const openEditRoomType = useCallback(
		(roomType: RoomType) =>
			setPanelMode({ kind: "editRoomType", item: roomType }),
		[],
	);
	const closePanel = useCallback(() => setPanelMode({ kind: "none" }), []);

	// ── Tab switching ───────────────────────────────────────────────────────────
	const setActiveTab = useCallback(
		(tab: ActiveTab) => {
			setPanelMode({ kind: "none" });
			setInputValue("");
			setParams({
				tab: tab === "rooms" ? null : tab,
				q: null,
				typeIds: null,
				blockIds: null,
				page: null,
			});
		},
		[setParams],
	);

	// ── Keyboard shortcuts ──────────────────────────────────────────────────────
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
			if (e.key === "Escape" && panelVisible) closePanel();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [panelVisible, closePanel]);

	const handleSearchChange = useCallback((value: string) => {
		setInputValue(value);
	}, []);

	// ── Delete targets ──────────────────────────────────────────────────────────
	const [deleteRoomTarget, setDeleteRoomTarget] =
		useState<RoomSummaryAdmin | null>(null);
	const [deleteBlockTarget, setDeleteBlockTarget] =
		useState<BlockSummary | null>(null);
	const [deleteRoomTypeTarget, setDeleteRoomTypeTarget] =
		useState<RoomType | null>(null);

	// ── Queries ─────────────────────────────────────────────────────────────────
	const roomFilters: RoomsAdminFilters = {
		q: debouncedInput.trim() || undefined,
		typeIds: paramTypeIds.length ? paramTypeIds : undefined,
		blockIds: paramBlockIds.length ? paramBlockIds : undefined,
		page: currentPage,
		pageSize: PAGE_SIZE,
	};

	const {
		data: roomsData,
		isLoading: roomsLoading,
		isError: roomsError,
		error: roomsErrorObj,
	} = useQuery(roomsAdminQueryOptions(roomFilters));

	const totalPages = roomsData?.totalPages ?? 1;
	const totalRooms = roomsData?.total ?? 0;

	const {
		data: blocksData,
		isLoading: blocksLoading,
		isError: blocksError,
		error: blocksErrorObj,
	} = useQuery(blocksQueryOptions);

	const {
		data: roomTypesData,
		isLoading: roomTypesLoading,
		isError: roomTypesError,
		error: roomTypesErrorObj,
	} = useQuery(roomTypesQueryOptions);

	const liveControllers = useControllerStream();
	const { data: controllerTargetsData } = useQuery(
		controllerTargetsQueryOptions,
	);

	const allRooms = roomsData?.result ?? [];
	const allBlocks = blocksData?.result ?? [];
	const roomTypes = roomTypesData?.result ?? [];

	// Client-side filter for blocks and types tabs
	const filteredBlocks = useMemo(() => {
		if (!debouncedInput.trim()) return allBlocks;
		const lower = debouncedInput.toLowerCase();
		return allBlocks.filter((b) => b.name.toLowerCase().includes(lower));
	}, [allBlocks, debouncedInput]);

	const filteredRoomTypes = useMemo(() => {
		if (!debouncedInput.trim()) return roomTypes;
		const lower = debouncedInput.toLowerCase();
		return roomTypes.filter(
			(t) =>
				t.name.toLowerCase().includes(lower) ||
				t.abbreviation.toLowerCase().includes(lower),
		);
	}, [roomTypes, debouncedInput]);

	const hasRoomsFilters =
		!!debouncedInput.trim() ||
		selectedTypeId !== "all" ||
		selectedBlockId !== "all";
	const activeRoomsFilterCount =
		(selectedTypeId !== "all" ? 1 : 0) + (selectedBlockId !== "all" ? 1 : 0);

	const goToPage = useCallback(
		(p: number) => setParams({ page: p === 1 ? null : p }),
		[setParams],
	);

	const paginationPages = useMemo(() => {
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}
		const pages: (number | "ellipsis")[] = [1];
		if (currentPage > 3) pages.push("ellipsis");
		const start = Math.max(2, currentPage - 1);
		const end = Math.min(totalPages - 1, currentPage + 1);
		for (let i = start; i <= end; i++) pages.push(i);
		if (currentPage < totalPages - 2) pages.push("ellipsis");
		pages.push(totalPages);
		return pages;
	}, [totalPages, currentPage]);

	const blockOptions = useMemo(
		() => allBlocks.map((b) => ({ value: b.id, label: b.name })),
		[allBlocks],
	);
	const typeOptions = useMemo(
		() =>
			roomTypes.map((t) => ({
				value: t.id,
				label: t.name,
				sublabel: t.abbreviation,
			})),
		[roomTypes],
	);

	const controllerOptions = useMemo(() => {
		const isOnline = (controllerId: string, lastSeenAt: string) => {
			// Check if live event came
			if (liveControllers[controllerId]?.lastSeenAt) {
				return (
					nowTick -
						new Date(liveControllers[controllerId].lastSeenAt).getTime() <
					45000
				);
			}
			return nowTick - new Date(lastSeenAt).getTime() < 45000;
		};

		const pairing = (controllerTargetsData?.pairingControllers ?? [])
			.filter((c) => isOnline(c.controllerId, c.lastSeenAt))
			.map((controller) => ({
				controllerId: controller.controllerId,
				label: `${controller.controllerId} (pareamento)`,
				group: "pairing" as const,
			}));

		const roomAssigned = (controllerTargetsData?.roomControllers ?? [])
			.filter((controller) => {
				if (panelMode.kind !== "editRoom") return false;
				return controller.roomId === panelMode.item.id;
			})
			.map((controller) => ({
				controllerId: controller.controllerId,
				label:
					`${controller.controllerId} (${controller.roomName})` +
					(isOnline(controller.controllerId, controller.lastSeenAt)
						? " - Online"
						: " - Offline"),
				group: "room" as const,
			}));

		return [...pairing, ...roomAssigned];
	}, [controllerTargetsData, panelMode, liveControllers, nowTick]);

	// ── Panel labels (memoized) ──────────────────────────────────────────────────
	const panelTitle = useMemo(() => {
		switch (panelMode.kind) {
			case "createRoom":
				return "Nova Sala";
			case "editRoom":
				return "Editar Sala";
			case "createBlock":
				return "Novo Bloco";
			case "editBlock":
				return "Editar Bloco";
			case "createRoomType":
				return "Novo Tipo de Sala";
			case "editRoomType":
				return "Editar Tipo de Sala";
			default:
				return "";
		}
	}, [panelMode.kind]);

	const panelSubtitle = useMemo(() => {
		switch (panelMode.kind) {
			case "createRoom":
				return "Preencha os dados para criar uma nova sala.";
			case "editRoom":
				return "Altere os dados da sala abaixo.";
			case "createBlock":
				return "Preencha os dados para criar um novo bloco.";
			case "editBlock":
				return "Altere o nome do bloco abaixo.";
			case "createRoomType":
				return "Preencha os dados para criar um novo tipo de sala.";
			case "editRoomType":
				return "Altere os dados do tipo de sala abaixo.";
			default:
				return "";
		}
	}, [panelMode.kind]);

	// ── Mutations ─────────────────────────────────────────────────────────────────
	const invalidateRooms = useCallback(
		() =>
			queryClient.invalidateQueries({ queryKey: roomsQueryKeys.adminList() }),
		[queryClient],
	);
	const invalidateBlocks = useCallback(
		() => queryClient.invalidateQueries({ queryKey: roomsQueryKeys.blocks }),
		[queryClient],
	);
	const invalidateRoomTypes = useCallback(
		() => queryClient.invalidateQueries({ queryKey: roomsQueryKeys.types }),
		[queryClient],
	);
	const invalidateRoomRelations = useCallback(
		(roomId: string) =>
			queryClient.invalidateQueries({
				queryKey: roomRelationsQueryOptions(roomId).queryKey,
			}),
		[queryClient],
	);

	const createRoomMutation = useMutation({
		mutationFn: createRoom,
		onSuccess: () => {
			invalidateRooms();
			toast.success("Sala criada com sucesso!");
			closePanel();
		},
		onError: (err: Error) => toast.error(err.message),
	});
	const updateRoomMutation = useMutation({
		mutationFn: updateRoom,
		onSuccess: (_data, variables) => {
			invalidateRooms();
			invalidateRoomRelations(variables.id);
			toast.success("Sala atualizada com sucesso!");
			closePanel();
		},
		onError: (err: Error) => toast.error(err.message),
	});
	const deleteRoomMutation = useMutation({
		mutationFn: deleteRoom,
		onSuccess: (_data, roomId) => {
			invalidateRooms();
			invalidateRoomRelations(roomId);
			toast.success("Sala excluida com sucesso!");
			setDeleteRoomTarget(null);
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const createBlockMutation = useMutation({
		mutationFn: createBlock,
		onSuccess: () => {
			invalidateBlocks();
			toast.success("Bloco criado com sucesso!");
			closePanel();
		},
		onError: (err: Error) => toast.error(err.message),
	});
	const updateBlockMutation = useMutation({
		mutationFn: updateBlock,
		onSuccess: () => {
			invalidateBlocks();
			toast.success("Bloco atualizado com sucesso!");
			closePanel();
		},
		onError: (err: Error) => toast.error(err.message),
	});
	const deleteBlockMutation = useMutation({
		mutationFn: deleteBlock,
		onSuccess: () => {
			invalidateBlocks();
			toast.success("Bloco excluido com sucesso!");
			setDeleteBlockTarget(null);
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const createRoomTypeMutation = useMutation({
		mutationFn: createRoomType,
		onSuccess: () => {
			invalidateRoomTypes();
			toast.success("Tipo de sala criado com sucesso!");
			closePanel();
		},
		onError: (err: Error) => toast.error(err.message),
	});
	const updateRoomTypeMutation = useMutation({
		mutationFn: updateRoomType,
		onSuccess: () => {
			invalidateRoomTypes();
			invalidateRooms();
			toast.success("Tipo de sala atualizado com sucesso!");
			closePanel();
		},
		onError: (err: Error) => toast.error(err.message),
	});
	const deleteRoomTypeMutation = useMutation({
		mutationFn: deleteRoomType,
		onSuccess: () => {
			invalidateRoomTypes();
			toast.success("Tipo de sala excluido com sucesso!");
			setDeleteRoomTypeTarget(null);
		},
		onError: (err: Error) => toast.error(err.message),
	});

	// ── Render ────────────────────────────────────────────────────────────────────
	return (
		<>
			<main className="flex w-full flex-1 flex-col overflow-hidden px-4 sm:px-8 md:px-16 lg:px-32 transition-all py-8">
				<SplitView
					open={panelVisible}
					onOpenChange={(open) => !open && closePanel()}
				>
					<SplitViewMain>
						<div className="flex flex-col gap-6">
							<RoomsHeader />

							<RoomsTabs
								activeTab={activeTab}
								onTabChange={setActiveTab}
								roomsCount={totalRooms}
								blocksCount={allBlocks.length}
								typesCount={roomTypes.length}
							/>

							<RoomsToolbar
								activeTab={activeTab}
								inputValue={inputValue}
								onSearchChange={handleSearchChange}
								searchInputRef={searchInputRef}
								panelVisible={panelVisible}
								selectedTypeId={selectedTypeId}
								selectedBlockId={selectedBlockId}
								onTypeChange={setSelectedTypeId}
								onBlockChange={setSelectedBlockId}
								activeFiltersCount={activeRoomsFilterCount}
								typeOptions={typeOptions}
								blockOptions={blockOptions}
								onCreateRoom={openCreateRoom}
								onCreateBlock={openCreateBlock}
								onCreateRoomType={openCreateRoomType}
							/>

							{activeTab === "rooms" && (
								<TabRooms
									isLoading={roomsLoading}
									isError={roomsError}
									error={roomsErrorObj instanceof Error ? roomsErrorObj : null}
									rooms={allRooms}
									hasFilters={hasRoomsFilters}
									totalRooms={totalRooms}
									totalPages={totalPages}
									currentPage={currentPage}
									paginationPages={paginationPages}
									onEdit={openEditRoom}
									onDelete={setDeleteRoomTarget}
									onCreateRoom={openCreateRoom}
									onGoToPage={goToPage}
								/>
							)}

							{activeTab === "blocks" && (
								<TabBlocks
									isLoading={blocksLoading}
									isError={blocksError}
									error={
										blocksErrorObj instanceof Error ? blocksErrorObj : null
									}
									blocks={filteredBlocks}
									hasFilters={!!debouncedInput.trim()}
									onEdit={openEditBlock}
									onDelete={setDeleteBlockTarget}
									onCreateBlock={openCreateBlock}
								/>
							)}

							{activeTab === "types" && (
								<TabRoomTypes
									isLoading={roomTypesLoading}
									isError={roomTypesError}
									error={
										roomTypesErrorObj instanceof Error
											? roomTypesErrorObj
											: null
									}
									roomTypes={filteredRoomTypes}
									hasFilters={!!debouncedInput.trim()}
									onEdit={openEditRoomType}
									onDelete={setDeleteRoomTypeTarget}
									onCreateRoomType={openCreateRoomType}
								/>
							)}
						</div>
					</SplitViewMain>

					<RoomsSidePanel
						panelMode={panelMode}
						panelTitle={panelTitle}
						panelSubtitle={panelSubtitle}
						allBlocks={allBlocks}
						roomTypes={roomTypes}
						controllerOptions={controllerOptions}
						onClose={closePanel}
						isSubmittingRoom={
							panelMode.kind === "editRoom"
								? updateRoomMutation.isPending
								: createRoomMutation.isPending
						}
						onSubmitRoom={(values) => {
							const editRoom =
								panelMode.kind === "editRoom" ? panelMode.item : null;
							if (editRoom) {
								updateRoomMutation.mutate({ id: editRoom.id, ...values });
							} else {
								createRoomMutation.mutate(values);
							}
						}}
						isSubmittingBlock={
							panelMode.kind === "editBlock"
								? updateBlockMutation.isPending
								: createBlockMutation.isPending
						}
						onSubmitBlock={(values) => {
							const editBlock =
								panelMode.kind === "editBlock" ? panelMode.item : null;
							if (editBlock) {
								updateBlockMutation.mutate({ id: editBlock.id, ...values });
							} else {
								createBlockMutation.mutate(values);
							}
						}}
						isSubmittingRoomType={
							panelMode.kind === "editRoomType"
								? updateRoomTypeMutation.isPending
								: createRoomTypeMutation.isPending
						}
						onSubmitRoomType={(values) => {
							const editRoomType =
								panelMode.kind === "editRoomType" ? panelMode.item : null;
							if (editRoomType) {
								updateRoomTypeMutation.mutate({
									id: editRoomType.id,
									...values,
								});
							} else {
								createRoomTypeMutation.mutate(values);
							}
						}}
					/>
				</SplitView>
			</main>

			<RoomsDialogs
				deleteRoomTarget={deleteRoomTarget}
				onDeleteRoomOpenChange={(open) => {
					if (!open) setDeleteRoomTarget(null);
				}}
				isDeletingRoom={deleteRoomMutation.isPending}
				onConfirmDeleteRoom={() => {
					if (deleteRoomTarget) deleteRoomMutation.mutate(deleteRoomTarget.id);
				}}
				deleteBlockTarget={deleteBlockTarget}
				onDeleteBlockOpenChange={(open) => {
					if (!open) setDeleteBlockTarget(null);
				}}
				isDeletingBlock={deleteBlockMutation.isPending}
				onConfirmDeleteBlock={() => {
					if (deleteBlockTarget)
						deleteBlockMutation.mutate(deleteBlockTarget.id);
				}}
				deleteRoomTypeTarget={deleteRoomTypeTarget}
				onDeleteRoomTypeOpenChange={(open) => {
					if (!open) setDeleteRoomTypeTarget(null);
				}}
				isDeletingRoomType={deleteRoomTypeMutation.isPending}
				onConfirmDeleteRoomType={() => {
					if (deleteRoomTypeTarget)
						deleteRoomTypeMutation.mutate(deleteRoomTypeTarget.id);
				}}
			/>
		</>
	);
}
