import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus, DoorOpen, Building2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CrudPageHeader } from "@/components/ui/crud-page-header";
import { SplitViewPanelHeader } from "@/components/ui/split-view-panel-header";
import {
  SplitView,
  SplitViewMain,
  SplitViewPanel,
} from "@/components/ui/split-view";
import { useDebounce } from "@/hooks/use-debounce";
import { fetchCurrentUser } from "@/services/users";

import { RoomsTable } from "@/components/rooms-admin/rooms-table";
import { RoomFormPanel } from "@/components/rooms-admin/room-form-panel";
import { RoomDeleteDialog } from "@/components/rooms-admin/room-delete-dialog";
import { BlocksTable } from "@/components/blocks/blocks-table";
import { BlockFormPanel } from "@/components/blocks/block-form-panel";
import { BlockDeleteDialog } from "@/components/blocks/block-delete-dialog";

import {
  blocksQueryOptions,
  createBlock,
  createRoom,
  deleteBlock,
  deleteRoom,
  roomsAdminQueryOptions,
  roomsQueryKeys,
  roomTypesQueryOptions,
  updateBlock,
  updateRoom,
} from "@/services/rooms";
import type { BlockSummary, RoomSummaryAdmin } from "@/services/rooms/types";

type ActiveTab = "rooms" | "blocks";

export const Route = createFileRoute("/rooms")({
  beforeLoad: async () => {
    try {
      const me = await fetchCurrentUser();
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
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(roomsAdminQueryOptions),
      context.queryClient.ensureQueryData(blocksQueryOptions),
      context.queryClient.ensureQueryData(roomTypesQueryOptions),
    ]),
  component: RoomsManagePage,
});

function RoomsManagePage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>("rooms");
  const [inputValue, setInputValue] = useState("");
  const debouncedQ = useDebounce(inputValue, 400);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<RoomSummaryAdmin | null>(null);
  const [deleteRoomTarget, setDeleteRoomTarget] =
    useState<RoomSummaryAdmin | null>(null);

  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<BlockSummary | null>(null);
  const [deleteBlockTarget, setDeleteBlockTarget] =
    useState<BlockSummary | null>(null);

  const panelVisible =
    roomFormOpen || editRoom !== null || blockFormOpen || editBlock !== null;

  function openCreateRoom() {
    setEditRoom(null);
    setEditBlock(null);
    setBlockFormOpen(false);
    setRoomFormOpen(true);
  }
  function openEditRoom(room: RoomSummaryAdmin) {
    setRoomFormOpen(false);
    setEditBlock(null);
    setBlockFormOpen(false);
    setEditRoom(room);
  }
  function openCreateBlock() {
    setEditBlock(null);
    setEditRoom(null);
    setRoomFormOpen(false);
    setBlockFormOpen(true);
  }
  function openEditBlock(block: BlockSummary) {
    setBlockFormOpen(false);
    setEditRoom(null);
    setRoomFormOpen(false);
    setEditBlock(block);
  }

  const closePanel = useCallback(() => {
    setRoomFormOpen(false);
    setEditRoom(null);
    setBlockFormOpen(false);
    setEditBlock(null);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally resets search only on tab change
  useEffect(() => {
    setInputValue("");
  }, [activeTab]);

  const {
    data: roomsData,
    isLoading: roomsLoading,
    isError: roomsError,
    error: roomsErrorObj,
  } = useQuery(roomsAdminQueryOptions);
  const {
    data: blocksData,
    isLoading: blocksLoading,
    isError: blocksError,
    error: blocksErrorObj,
  } = useQuery(blocksQueryOptions);
  const { data: roomTypesData } = useQuery(roomTypesQueryOptions);

  const allRooms = roomsData?.result ?? [];
  const allBlocks = blocksData?.result ?? [];
  const roomTypes = roomTypesData?.result ?? [];

  const filteredRooms = debouncedQ.trim()
    ? allRooms.filter(
        (r) =>
          r.name.toLowerCase().includes(debouncedQ.toLowerCase()) ||
          r.blockName.toLowerCase().includes(debouncedQ.toLowerCase()),
      )
    : allRooms;

  const filteredBlocks = debouncedQ.trim()
    ? allBlocks.filter((b) =>
        b.name.toLowerCase().includes(debouncedQ.toLowerCase()),
      )
    : allBlocks;

  const hasFilters = !!debouncedQ.trim();

  const invalidateRooms = () =>
    queryClient.invalidateQueries({ queryKey: roomsQueryKeys.adminList });
  const invalidateBlocks = () =>
    queryClient.invalidateQueries({ queryKey: roomsQueryKeys.blocks });

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
    onSuccess: () => {
      invalidateRooms();
      toast.success("Sala atualizada com sucesso!");
      closePanel();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const deleteRoomMutation = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      invalidateRooms();
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

  function getPanelTitle() {
    if (roomFormOpen) return "Nova Sala";
    if (editRoom) return "Editar Sala";
    if (blockFormOpen) return "Novo Bloco";
    if (editBlock) return "Editar Bloco";
    return "";
  }
  function getPanelSubtitle() {
    if (roomFormOpen) return "Preencha os dados para criar uma nova sala.";
    if (editRoom) return "Altere os dados da sala abaixo.";
    if (blockFormOpen) return "Preencha os dados para criar um novo bloco.";
    if (editBlock) return "Altere o nome do bloco abaixo.";
    return "";
  }

  return (
    <>
      <main className="flex w-full flex-1 flex-col overflow-hidden px-4 sm:px-8 md:px-16 lg:px-24 py-8">
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
              </div>

              <SearchToolbar
                value={inputValue}
                onChange={setInputValue}
                inputRef={searchInputRef}
                placeholder={
                  activeTab === "rooms"
                    ? "Buscar por nome ou bloco..."
                    : "Buscar por nome..."
                }
                actions={
                  activeTab === "rooms" ? (
                    <Button size="sm" variant="hover" onClick={openCreateRoom}>
                      <Plus className="size-4" /> Nova Sala
                    </Button>
                  ) : (
                    <Button size="sm" variant="hover" onClick={openCreateBlock}>
                      <Plus className="size-4" /> Novo Bloco
                    </Button>
                  )
                }
              />

              {activeTab === "rooms" && (
                <>
                  {roomsLoading ? (
                    <TableSkeleton />
                  ) : roomsError ? (
                    <div className="py-16 text-center text-sm text-red-500">
                      {roomsErrorObj instanceof Error
                        ? roomsErrorObj.message
                        : "Erro ao carregar as salas."}
                    </div>
                  ) : filteredRooms.length === 0 ? (
                    <EmptyState
                      icon={DoorOpen}
                      message={
                        hasFilters
                          ? "Nenhuma sala encontrada com os filtros aplicados."
                          : "Nenhuma sala cadastrada ate o momento."
                      }
                    />
                  ) : (
                    <RoomsTable
                      rooms={filteredRooms}
                      onEdit={openEditRoom}
                      onDelete={setDeleteRoomTarget}
                    />
                  )}
                </>
              )}

              {activeTab === "blocks" && (
                <>
                  {blocksLoading ? (
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
                        hasFilters
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
                  )}
                </>
              )}
            </div>
          </SplitViewMain>

          <SplitViewPanel className="flex flex-col pl-6">
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
