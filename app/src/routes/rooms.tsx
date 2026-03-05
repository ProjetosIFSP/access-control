import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Building2, DoorOpen, Plus, Tag } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BlockDeleteDialog } from "@/components/blocks/block-delete-dialog";
import { BlockFormPanel } from "@/components/blocks/block-form-panel";
import { BlocksTable } from "@/components/blocks/blocks-table";
import { RoomTypeDeleteDialog } from "@/components/room-types/room-type-delete-dialog";
import { RoomTypeFormPanel } from "@/components/room-types/room-type-form-panel";
import { RoomTypesTable } from "@/components/room-types/room-types-table";
import { RoomDeleteDialog } from "@/components/rooms-admin/room-delete-dialog";
import { RoomFormPanel } from "@/components/rooms-admin/room-form-panel";
import { RoomsTable } from "@/components/rooms-admin/rooms-table";
import { Button } from "@/components/ui/button";
import { CrudPageHeader } from "@/components/ui/crud-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SplitView,
  SplitViewMain,
  SplitViewPanel,
} from "@/components/ui/split-view";
import { SplitViewPanelHeader } from "@/components/ui/split-view-panel-header";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useDebounce } from "@/hooks/use-debounce";
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
import { currentUserQueryOptions, usersQueryOptions } from "@/services/users";

type ActiveTab = "rooms" | "blocks" | "types";

export const Route = createFileRoute("/rooms")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (["rooms", "blocks", "types"].includes(search.tab as string)
      ? search.tab
      : "rooms") as ActiveTab,
    q: typeof search.q === "string" ? search.q : undefined,
    typeIds: Array.isArray(search.typeIds)
      ? (search.typeIds as string[]).filter(Boolean)
      : typeof search.typeIds === "string" && search.typeIds.trim()
        ? search.typeIds.split(",").filter(Boolean)
        : undefined,
    blockIds: Array.isArray(search.blockIds)
      ? (search.blockIds as string[]).filter(Boolean)
      : typeof search.blockIds === "string" && search.blockIds.trim()
        ? search.blockIds.split(",").filter(Boolean)
        : undefined,
  }),
  beforeLoad: async ({ context }) => {
    try {
      const me = await context.queryClient.ensureQueryData(
        currentUserQueryOptions,
      );
      if (!me.isAdmin)
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
  loaderDeps: ({ search: { q, typeIds, blockIds } }) => ({
    q,
    typeIds,
    blockIds,
  }),
  loader: ({ context, deps }) => {
    const roomFilters: RoomsAdminFilters = {
      q: deps.q,
      typeIds: deps.typeIds,
      blockIds: deps.blockIds,
    };
    return Promise.all([
      context.queryClient.ensureQueryData(roomsAdminQueryOptions(roomFilters)),
      context.queryClient.ensureQueryData(blocksQueryOptions),
      context.queryClient.ensureQueryData(roomTypesQueryOptions),
      context.queryClient.ensureQueryData(profilesQueryOptions),
      context.queryClient.ensureQueryData(usersQueryOptions({})),
    ]);
  },
  component: RoomsManagePage,
});

function RoomsManagePage() {
  const queryClient = useQueryClient();
  const {
    tab: tabParam,
    q: qParam,
    typeIds: typeIdsParam,
    blockIds: blockIdsParam,
  } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>(tabParam ?? "rooms");
  const [inputValue, setInputValue] = useState(qParam ?? "");
  const debouncedQ = useDebounce(inputValue, 400);
  const syncMounted = useRef(false);
  const tabMounted = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Rooms filter state (synced to URL)
  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    typeIdsParam?.[0] ?? "all",
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string>(
    blockIdsParam?.[0] ?? "all",
  );

  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<RoomSummaryAdmin | null>(null);
  const [deleteRoomTarget, setDeleteRoomTarget] =
    useState<RoomSummaryAdmin | null>(null);

  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<BlockSummary | null>(null);
  const [deleteBlockTarget, setDeleteBlockTarget] =
    useState<BlockSummary | null>(null);

  const [roomTypeFormOpen, setRoomTypeFormOpen] = useState(false);
  const [editRoomType, setEditRoomType] = useState<RoomType | null>(null);
  const [deleteRoomTypeTarget, setDeleteRoomTypeTarget] =
    useState<RoomType | null>(null);

  const panelVisible =
    roomFormOpen ||
    editRoom !== null ||
    blockFormOpen ||
    editBlock !== null ||
    roomTypeFormOpen ||
    editRoomType !== null;

  function openCreateRoom() {
    setEditRoom(null);
    setEditBlock(null);
    setBlockFormOpen(false);
    setRoomTypeFormOpen(false);
    setEditRoomType(null);
    setRoomFormOpen(true);
  }
  function openEditRoom(room: RoomSummaryAdmin) {
    setRoomFormOpen(false);
    setEditBlock(null);
    setBlockFormOpen(false);
    setRoomTypeFormOpen(false);
    setEditRoomType(null);
    setEditRoom(room);
  }
  function openCreateBlock() {
    setEditBlock(null);
    setEditRoom(null);
    setRoomFormOpen(false);
    setRoomTypeFormOpen(false);
    setEditRoomType(null);
    setBlockFormOpen(true);
  }
  function openEditBlock(block: BlockSummary) {
    setBlockFormOpen(false);
    setEditRoom(null);
    setRoomFormOpen(false);
    setRoomTypeFormOpen(false);
    setEditRoomType(null);
    setEditBlock(block);
  }
  function openCreateRoomType() {
    setEditRoomType(null);
    setEditRoom(null);
    setRoomFormOpen(false);
    setEditBlock(null);
    setBlockFormOpen(false);
    setRoomTypeFormOpen(true);
  }
  function openEditRoomType(roomType: RoomType) {
    setRoomTypeFormOpen(false);
    setEditRoom(null);
    setRoomFormOpen(false);
    setEditBlock(null);
    setBlockFormOpen(false);
    setEditRoomType(roomType);
  }

  const closePanel = useCallback(() => {
    setRoomFormOpen(false);
    setEditRoom(null);
    setBlockFormOpen(false);
    setEditBlock(null);
    setRoomTypeFormOpen(false);
    setEditRoomType(null);
  }, []);

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

  // Sync debounced search + filter changes to URL + trigger refetch
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (!syncMounted.current) {
      syncMounted.current = true;
      return;
    }
    navigate({
      search: (prev) => ({
        ...prev,
        q: debouncedQ.trim() || undefined,
        typeIds: selectedTypeId !== "all" ? [selectedTypeId] : undefined,
        blockIds: selectedBlockId !== "all" ? [selectedBlockId] : undefined,
      }),
      replace: true,
    });
  }, [debouncedQ, selectedTypeId, selectedBlockId]);

  // Reset filters + URL when switching tabs
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally resets on tab change
  useEffect(() => {
    if (!tabMounted.current) {
      tabMounted.current = true;
      return;
    }
    setInputValue("");
    setSelectedTypeId("all");
    setSelectedBlockId("all");
    closePanel();
    navigate({
      search: (prev) => ({
        ...prev,
        tab: activeTab,
        q: undefined,
        typeIds: undefined,
        blockIds: undefined,
      }),
      replace: true,
    });
  }, [activeTab]);

  // Query for rooms with current filters from URL
  const roomFilters: RoomsAdminFilters = {
    q: qParam,
    typeIds: typeIdsParam,
    blockIds: blockIdsParam,
  };

  const {
    data: roomsData,
    isLoading: roomsLoading,
    isError: roomsError,
    error: roomsErrorObj,
  } = useQuery(roomsAdminQueryOptions(roomFilters));
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

  const allRooms = roomsData?.result ?? [];
  const allBlocks = blocksData?.result ?? [];
  const roomTypes = roomTypesData?.result ?? [];

  // Blocks tab and types tab filter client-side
  const filteredBlocks = debouncedQ.trim()
    ? allBlocks.filter((b) =>
        b.name.toLowerCase().includes(debouncedQ.toLowerCase()),
      )
    : allBlocks;

  const filteredRoomTypes = debouncedQ.trim()
    ? roomTypes.filter(
        (t) =>
          t.name.toLowerCase().includes(debouncedQ.toLowerCase()) ||
          t.abbreviation.toLowerCase().includes(debouncedQ.toLowerCase()),
      )
    : roomTypes;

  const hasRoomsFilters =
    !!qParam?.trim() || selectedTypeId !== "all" || selectedBlockId !== "all";
  const roomsFilterActiveCount =
    (selectedTypeId !== "all" ? 1 : 0) + (selectedBlockId !== "all" ? 1 : 0);

  function clearRoomsFilters() {
    setSelectedTypeId("all");
    setSelectedBlockId("all");
    setInputValue("");
  }

  const invalidateRooms = () =>
    queryClient.invalidateQueries({ queryKey: roomsQueryKeys.adminList() });
  const invalidateBlocks = () =>
    queryClient.invalidateQueries({ queryKey: roomsQueryKeys.blocks });
  const invalidateRoomTypes = () =>
    queryClient.invalidateQueries({ queryKey: roomsQueryKeys.types });

  const invalidateRoomRelations = (roomId: string) =>
    queryClient.invalidateQueries({
      queryKey: roomRelationsQueryOptions(roomId).queryKey,
    });

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

  function getPanelTitle() {
    if (roomFormOpen) return "Nova Sala";
    if (editRoom) return "Editar Sala";
    if (blockFormOpen) return "Novo Bloco";
    if (editBlock) return "Editar Bloco";
    if (roomTypeFormOpen) return "Novo Tipo de Sala";
    if (editRoomType) return "Editar Tipo de Sala";
    return "";
  }
  function getPanelSubtitle() {
    if (roomFormOpen) return "Preencha os dados para criar uma nova sala.";
    if (editRoom) return "Altere os dados da sala abaixo.";
    if (blockFormOpen) return "Preencha os dados para criar um novo bloco.";
    if (editBlock) return "Altere o nome do bloco abaixo.";
    if (roomTypeFormOpen)
      return "Preencha os dados para criar um novo tipo de sala.";
    if (editRoomType) return "Altere os dados do tipo de sala abaixo.";
    return "";
  }

  const blockOptions = allBlocks.map((b) => ({ value: b.id, label: b.name }));
  const typeOptions = roomTypes.map((t) => ({
    value: t.id,
    label: t.name,
    sublabel: t.abbreviation,
  }));

  return (
    <>
      <main className="flex w-full flex-1 flex-col overflow-hidden px-4 sm:px-8 md:px-16 lg:px-32 transition-all py-8">
        <SplitView
          open={panelVisible}
          onOpenChange={(open) => !open && closePanel()}
        >
          <SplitViewMain>
            <div className="flex flex-col gap-6">
              <CrudPageHeader
                title="Salas e Blocos"
                subtitle="Gerencie as salas e blocos cadastrados no sistema."
              />

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b">
                <TabButton
                  active={activeTab === "rooms"}
                  onClick={() => setActiveTab("rooms")}
                  icon={<DoorOpen className="size-3.5" />}
                  label="Salas"
                  count={allRooms.length}
                />
                <TabButton
                  active={activeTab === "blocks"}
                  onClick={() => setActiveTab("blocks")}
                  icon={<Building2 className="size-3.5" />}
                  label="Blocos"
                  count={allBlocks.length}
                />
                <TabButton
                  active={activeTab === "types"}
                  onClick={() => setActiveTab("types")}
                  icon={<Tag className="size-3.5" />}
                  label="Tipos"
                  count={roomTypes.length}
                />
              </div>

              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <SearchToolbar
                    value={inputValue}
                    onChange={setInputValue}
                    inputRef={searchInputRef}
                    placeholder={
                      activeTab === "rooms"
                        ? "Buscar por nome..."
                        : activeTab === "types"
                          ? "Buscar por nome ou sigla..."
                          : "Buscar por nome..."
                    }
                  />

                  {/* Rooms filters */}
                  {activeTab === "rooms" &&
                    (blockOptions.length > 0 || typeOptions.length > 0) && (
                      <FilterBar
                        activeCount={roomsFilterActiveCount}
                        panelOpen={panelVisible}
                        onClear={clearRoomsFilters}
                      >
                        {typeOptions.length > 0 && (
                          <div className="min-w-[170px]">
                            <Select
                              value={selectedTypeId}
                              onValueChange={setSelectedTypeId}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Tipos de sala" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  Todos os tipos
                                </SelectItem>
                                {typeOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {blockOptions.length > 0 && (
                          <div className="min-w-[170px]">
                            <Select
                              value={selectedBlockId}
                              onValueChange={setSelectedBlockId}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Blocos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  Todos os blocos
                                </SelectItem>
                                {blockOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </FilterBar>
                    )}
                </div>
                <div className="flex-shrink-0">
                  {activeTab === "rooms" ? (
                    <Button
                      size={panelVisible ? "icon" : "sm"}
                      variant="hover"
                      onClick={openCreateRoom}
                      className={
                        !panelVisible ? "max-sm:px-2 max-sm:w-9 max-sm:h-9" : ""
                      }
                    >
                      <Plus className="size-4" />
                      <span
                        className={`hidden ${!panelVisible ? "sm:inline" : ""}`}
                      >
                        Nova Sala
                      </span>
                    </Button>
                  ) : activeTab === "blocks" ? (
                    <Button
                      size={panelVisible ? "icon" : "sm"}
                      variant="hover"
                      onClick={openCreateBlock}
                      className={
                        !panelVisible ? "max-sm:px-2 max-sm:w-9 max-sm:h-9" : ""
                      }
                    >
                      <Plus className="size-4" />
                      <span
                        className={`hidden ${!panelVisible ? "sm:inline" : ""}`}
                      >
                        Novo Bloco
                      </span>
                    </Button>
                  ) : (
                    <Button
                      size={panelVisible ? "icon" : "sm"}
                      variant="hover"
                      onClick={openCreateRoomType}
                      className={
                        !panelVisible ? "max-sm:px-2 max-sm:w-9 max-sm:h-9" : ""
                      }
                    >
                      <Plus className="size-4" />
                      <span
                        className={`hidden ${!panelVisible ? "sm:inline" : ""}`}
                      >
                        Novo Tipo
                      </span>
                    </Button>
                  )}
                </div>
              </div>

              {activeTab === "rooms" &&
                (roomsLoading ? (
                  <TableSkeleton />
                ) : roomsError ? (
                  <div className="py-16 text-center text-sm text-red-500">
                    {roomsErrorObj instanceof Error
                      ? roomsErrorObj.message
                      : "Erro ao carregar as salas."}
                  </div>
                ) : allRooms.length === 0 ? (
                  <EmptyState
                    icon={DoorOpen}
                    message={
                      hasRoomsFilters
                        ? "Nenhuma sala encontrada com os filtros aplicados."
                        : "Nenhuma sala cadastrada ate o momento."
                    }
                  />
                ) : (
                  <RoomsTable
                    rooms={allRooms}
                    onEdit={openEditRoom}
                    onDelete={setDeleteRoomTarget}
                  />
                ))}

              {activeTab === "blocks" &&
                (blocksLoading ? (
                  <TableSkeleton />
                ) : blocksError ? (
                  <div className="py-16 text-center text-sm text-red-500">
                    {blocksErrorObj instanceof Error
                      ? blocksErrorObj.message
                      : "Erro ao carregar os blocos."}
                  </div>
                ) : filteredBlocks.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    message={
                      debouncedQ.trim()
                        ? "Nenhum bloco encontrado com os filtros aplicados."
                        : "Nenhum bloco cadastrado ate o momento."
                    }
                  />
                ) : (
                  <BlocksTable
                    blocks={filteredBlocks}
                    onEdit={openEditBlock}
                    onDelete={setDeleteBlockTarget}
                  />
                ))}

              {activeTab === "types" &&
                (roomTypesLoading ? (
                  <TableSkeleton />
                ) : roomTypesError ? (
                  <div className="py-16 text-center text-sm text-red-500">
                    {roomTypesErrorObj instanceof Error
                      ? roomTypesErrorObj.message
                      : "Erro ao carregar os tipos de sala."}
                  </div>
                ) : filteredRoomTypes.length === 0 ? (
                  <EmptyState
                    icon={Tag}
                    message={
                      debouncedQ.trim()
                        ? "Nenhum tipo encontrado com os filtros aplicados."
                        : "Nenhum tipo de sala cadastrado ate o momento."
                    }
                  />
                ) : (
                  <RoomTypesTable
                    roomTypes={filteredRoomTypes}
                    onEdit={openEditRoomType}
                    onDelete={setDeleteRoomTypeTarget}
                  />
                ))}
            </div>
          </SplitViewMain>

          <SplitViewPanel className="flex flex-col">
            <SplitViewPanelHeader
              title={getPanelTitle()}
              subtitle={getPanelSubtitle()}
              onClose={closePanel}
            />
            <div className="flex-1 overflow-y-auto py-6">
              {(roomFormOpen || editRoom) && (
                <RoomFormPanel
                  room={editRoom}
                  blocks={allBlocks}
                  roomTypes={roomTypes}
                  isSubmitting={
                    editRoom
                      ? updateRoomMutation.isPending
                      : createRoomMutation.isPending
                  }
                  onSubmit={(values) => {
                    if (editRoom)
                      updateRoomMutation.mutate({ id: editRoom.id, ...values });
                    else createRoomMutation.mutate(values);
                  }}
                  onCancel={closePanel}
                />
              )}
              {(blockFormOpen || editBlock) && (
                <BlockFormPanel
                  block={editBlock}
                  isSubmitting={
                    editBlock
                      ? updateBlockMutation.isPending
                      : createBlockMutation.isPending
                  }
                  onSubmit={(values) => {
                    if (editBlock)
                      updateBlockMutation.mutate({
                        id: editBlock.id,
                        ...values,
                      });
                    else createBlockMutation.mutate(values);
                  }}
                  onCancel={closePanel}
                />
              )}
              {(roomTypeFormOpen || editRoomType) && (
                <RoomTypeFormPanel
                  roomType={editRoomType}
                  isSubmitting={
                    editRoomType
                      ? updateRoomTypeMutation.isPending
                      : createRoomTypeMutation.isPending
                  }
                  onSubmit={(values) => {
                    if (editRoomType)
                      updateRoomTypeMutation.mutate({
                        id: editRoomType.id,
                        ...values,
                      });
                    else createRoomTypeMutation.mutate(values);
                  }}
                  onCancel={closePanel}
                />
              )}
            </div>
          </SplitViewPanel>
        </SplitView>
      </main>

      <RoomDeleteDialog
        open={deleteRoomTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteRoomTarget(null);
        }}
        room={deleteRoomTarget}
        isDeleting={deleteRoomMutation.isPending}
        onConfirm={() => {
          if (deleteRoomTarget) deleteRoomMutation.mutate(deleteRoomTarget.id);
        }}
      />

      <BlockDeleteDialog
        open={deleteBlockTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteBlockTarget(null);
        }}
        block={deleteBlockTarget}
        isDeleting={deleteBlockMutation.isPending}
        onConfirm={() => {
          if (deleteBlockTarget)
            deleteBlockMutation.mutate(deleteBlockTarget.id);
        }}
      />

      <RoomTypeDeleteDialog
        open={deleteRoomTypeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteRoomTypeTarget(null);
        }}
        roomType={deleteRoomTypeTarget}
        isDeleting={deleteRoomTypeMutation.isPending}
        onConfirm={() => {
          if (deleteRoomTypeTarget)
            deleteRoomTypeMutation.mutate(deleteRoomTypeTarget.id);
        }}
      />
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
          : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      }`}
    >
      {icon}
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
          active
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
