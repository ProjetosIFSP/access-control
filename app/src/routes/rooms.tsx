import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Building2, DoorOpen, Plus, Tag } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { SelectFilter } from "@/components/ui/select-filter";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  SplitView,
  SplitViewMain,
  SplitViewPanel,
} from "@/components/ui/split-view";
import { SplitViewPanelHeader } from "@/components/ui/split-view-panel-header";
import { TabButton } from "@/components/ui/tab-button";
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
    tab: (search.tab === "blocks" || search.tab === "types"
      ? search.tab
      : undefined) as ActiveTab | undefined,
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
    page:
      typeof search.page === "number" && search.page > 0
        ? Math.floor(search.page)
        : typeof search.page === "string" && Number(search.page) > 0
          ? Math.floor(Number(search.page))
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
  loaderDeps: ({ search: { q, typeIds, blockIds, page } }) => ({
    q,
    typeIds,
    blockIds,
    page,
  }),
  loader: ({ context, deps }) => {
    const roomFilters: RoomsAdminFilters = {
      q: deps.q,
      typeIds: deps.typeIds,
      blockIds: deps.blockIds,
      page: deps.page ?? 1,
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

const PAGE_SIZE = 20;

function RoomsManagePage() {
  const queryClient = useQueryClient();
  const {
    tab: tabParam,
    q: qParam,
    typeIds: typeIdsParam,
    blockIds: blockIdsParam,
    page: pageParam,
  } = Route.useSearch();
  const navigate = Route.useNavigate();

  const currentPage = pageParam ?? 1;

  const activeTabResolved: ActiveTab = tabParam ?? "rooms";
  const [activeTab, setActiveTab] = useState<ActiveTab>(activeTabResolved);
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

  // ── Panel state — single "active panel" discriminated union ─────────────────
  type PanelMode =
    | { kind: "none" }
    | { kind: "createRoom" }
    | { kind: "editRoom"; item: RoomSummaryAdmin }
    | { kind: "createBlock" }
    | { kind: "editBlock"; item: BlockSummary }
    | { kind: "createRoomType" }
    | { kind: "editRoomType"; item: RoomType };

  const [panelMode, setPanelMode] = useState<PanelMode>({ kind: "none" });

  const panelVisible = panelMode.kind !== "none";

  const roomFormOpen =
    panelMode.kind === "createRoom" || panelMode.kind === "editRoom";
  const editRoom = panelMode.kind === "editRoom" ? panelMode.item : null;

  const blockFormOpen =
    panelMode.kind === "createBlock" || panelMode.kind === "editBlock";
  const editBlock = panelMode.kind === "editBlock" ? panelMode.item : null;

  const roomTypeFormOpen =
    panelMode.kind === "createRoomType" || panelMode.kind === "editRoomType";
  const editRoomType =
    panelMode.kind === "editRoomType" ? panelMode.item : null;

  // Delete targets remain independent (dialogs can be open alongside panel)
  const [deleteRoomTarget, setDeleteRoomTarget] =
    useState<RoomSummaryAdmin | null>(null);
  const [deleteBlockTarget, setDeleteBlockTarget] =
    useState<BlockSummary | null>(null);
  const [deleteRoomTypeTarget, setDeleteRoomTypeTarget] =
    useState<RoomType | null>(null);

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
        page: undefined, // reset to page 1 on filter change
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
        tab: activeTab === "rooms" ? undefined : activeTab,
        q: undefined,
        typeIds: undefined,
        blockIds: undefined,
        page: undefined,
      }),
      replace: true,
    });
  }, [activeTab]);

  // Query for rooms with current filters from URL
  const roomFilters: RoomsAdminFilters = {
    q: qParam,
    typeIds: typeIdsParam,
    blockIds: blockIdsParam,
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

  const allRooms = roomsData?.result ?? [];
  const allBlocks = blocksData?.result ?? [];
  const roomTypes = roomTypesData?.result ?? [];

  // Blocks tab and types tab filter client-side (memoized)
  const lowerDebouncedQ = debouncedQ.toLowerCase();

  const filteredBlocks = useMemo(() => {
    if (!debouncedQ.trim()) return allBlocks;
    return allBlocks.filter((b) =>
      b.name.toLowerCase().includes(lowerDebouncedQ),
    );
  }, [allBlocks, debouncedQ, lowerDebouncedQ]);

  const filteredRoomTypes = useMemo(() => {
    if (!debouncedQ.trim()) return roomTypes;
    return roomTypes.filter(
      (t) =>
        t.name.toLowerCase().includes(lowerDebouncedQ) ||
        t.abbreviation.toLowerCase().includes(lowerDebouncedQ),
    );
  }, [roomTypes, debouncedQ, lowerDebouncedQ]);

  const hasRoomsFilters =
    !!qParam?.trim() || selectedTypeId !== "all" || selectedBlockId !== "all";
  const activeRoomsFilterCount =
    (selectedTypeId !== "all" ? 1 : 0) + (selectedBlockId !== "all" ? 1 : 0);

  const goToPage = useCallback(
    (p: number) => {
      navigate({
        search: (prev) => ({
          ...prev,
          page: p === 1 ? undefined : p,
        }),
        replace: true,
      });
    },
    [navigate],
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
              <div className="flex items-center gap-1">
                <TabButton
                  active={activeTab === "rooms"}
                  onClick={() => setActiveTab("rooms")}
                  label="Salas"
                  count={totalRooms}
                />
                <TabButton
                  active={activeTab === "blocks"}
                  onClick={() => setActiveTab("blocks")}
                  label="Blocos"
                  count={allBlocks.length}
                />
                <TabButton
                  active={activeTab === "types"}
                  onClick={() => setActiveTab("types")}
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
                    (typeOptions.length > 0 || blockOptions.length > 0) && (
                      <FilterBar
                        activeCount={activeRoomsFilterCount}
                        panelOpen={panelVisible}
                      >
                        {typeOptions.length > 0 && (
                          <SelectFilter
                            value={selectedTypeId}
                            onValueChange={setSelectedTypeId}
                            placeholder="Tipos"
                            options={typeOptions}
                          />
                        )}
                        {blockOptions.length > 0 && (
                          <SelectFilter
                            value={selectedBlockId}
                            onValueChange={setSelectedBlockId}
                            placeholder="Blocos"
                            options={blockOptions}
                          />
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
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <DoorOpen />
                      </EmptyMedia>
                      <EmptyTitle>Nenhuma sala encontrada</EmptyTitle>
                      <EmptyDescription>
                        {hasRoomsFilters
                          ? "Nenhuma sala encontrada com os filtros aplicados."
                          : "Nenhuma sala cadastrada ate o momento."}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className="flex-row justify-center gap-2">
                      <Button variant="hover" onClick={openCreateRoom}>
                        Cadastrar sala
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <>
                    <RoomsTable
                      rooms={allRooms}
                      onEdit={openEditRoom}
                      onDelete={setDeleteRoomTarget}
                    />
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between gap-4 pt-2">
                        <p className="text-sm text-muted-foreground">
                          {totalRooms} sala{totalRooms !== 1 ? "s" : ""} no
                          total
                        </p>
                        <Pagination className="mx-0 w-auto">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={
                                  currentPage > 1
                                    ? () => goToPage(currentPage - 1)
                                    : undefined
                                }
                                aria-disabled={currentPage <= 1}
                                className={
                                  currentPage <= 1
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer"
                                }
                              />
                            </PaginationItem>
                            {paginationPages.map((p, i) =>
                              p === "ellipsis" ? (
                                <PaginationItem
                                  key={`ellipsis-${i < paginationPages.length / 2 ? "start" : "end"}`}
                                >
                                  <PaginationEllipsis />
                                </PaginationItem>
                              ) : (
                                <PaginationItem key={p}>
                                  <PaginationLink
                                    isActive={p === currentPage}
                                    onClick={() => goToPage(p)}
                                    className="cursor-pointer"
                                  >
                                    {p}
                                  </PaginationLink>
                                </PaginationItem>
                              ),
                            )}
                            <PaginationItem>
                              <PaginationNext
                                onClick={
                                  currentPage < totalPages
                                    ? () => goToPage(currentPage + 1)
                                    : undefined
                                }
                                aria-disabled={currentPage >= totalPages}
                                className={
                                  currentPage >= totalPages
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer"
                                }
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
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
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Building2 />
                      </EmptyMedia>
                      <EmptyTitle>Nenhum bloco encontrado</EmptyTitle>
                      <EmptyDescription>
                        {debouncedQ.trim()
                          ? "Nenhum bloco encontrado com os filtros aplicados."
                          : "Nenhum bloco cadastrado ate o momento."}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className="flex-row justify-center gap-2">
                      <Button variant="hover" onClick={openCreateBlock}>
                        Cadastrar bloco
                      </Button>
                    </EmptyContent>
                  </Empty>
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
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Tag />
                      </EmptyMedia>
                      <EmptyTitle>Nenhum tipo encontrado</EmptyTitle>
                      <EmptyDescription>
                        {debouncedQ.trim()
                          ? "Nenhum tipo encontrado com os filtros aplicados."
                          : "Nenhum tipo de sala cadastrado ate o momento."}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className="flex-row justify-center gap-2">
                      <Button variant="hover" onClick={openCreateRoomType}>
                        Cadastrar tipo
                      </Button>
                    </EmptyContent>
                  </Empty>
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
              title={panelTitle}
              subtitle={panelSubtitle}
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
