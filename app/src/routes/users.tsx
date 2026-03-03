import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CrudPageHeader } from "@/components/ui/crud-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { SplitViewPanelHeader } from "@/components/ui/split-view-panel-header";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { UsersTable } from "@/components/users/users-table";
import { UserFormPanel } from "@/components/users/user-form-panel";
import { UserDeleteDialog } from "@/components/users/user-delete-dialog";
import {
  SplitView,
  SplitViewMain,
  SplitViewPanel,
} from "@/components/ui/split-view";
import {
  createUser,
  deleteUser,
  fetchCurrentUser,
  updateUser,
  usersQueryKeys,
  usersQueryOptions,
} from "@/services/users";
import type { UserSummary } from "@/services/users/types";

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/users")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
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
  loaderDeps: ({ search: { q } }) => ({ q }),
  loader: ({ context, deps: { q } }) =>
    context.queryClient.ensureQueryData(usersQueryOptions({ q })),
  component: UsersPage,
});

// ── Component ─────────────────────────────────────────────────────────────────

function UsersPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState(q ?? "");
  const debouncedQ = useDebounce(inputValue, 400);
  const isMounted = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Panel state
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserSummary | null>(null);

  const panelVisible = formOpen || editUser !== null;

  function openCreate() {
    setEditUser(null);
    setFormOpen(true);
  }

  function openEdit(user: UserSummary) {
    setFormOpen(false);
    setEditUser(user);
  }

  const closePanel = useCallback(() => {
    setEditUser(null);
    setFormOpen(false);
  }, []);

  // Sync debounced search value to URL
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    navigate({
      search: (prev) => ({ ...prev, q: debouncedQ.trim() || undefined }),
      replace: true,
    });
  }, [debouncedQ, navigate]);

  // Ctrl+K focus search | Escape close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && panelVisible) {
        closePanel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [panelVisible, closePanel]);

  const { data, isLoading, isError, error } = useQuery(
    usersQueryOptions({ q }),
  );

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: usersQueryKeys.all });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      invalidateUsers();
      toast.success("Usuario criado com sucesso!");
      closePanel();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      invalidateUsers();
      toast.success("Usuario atualizado com sucesso!");
      closePanel();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      invalidateUsers();
      toast.success("Usuario excluido com sucesso!");
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const users = data?.result ?? [];
  const hasFilters = !!q?.trim();

  // ── Render ────────────────────────────────────────────────────────────────

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
                title="Usuarios"
                subtitle="Gerencie os usuarios cadastrados no sistema."
              />

              <SearchToolbar
                value={inputValue}
                onChange={setInputValue}
                inputRef={searchInputRef}
                placeholder="Buscar por nome ou e-mail..."
                actions={
                  <Button size="sm" variant="hover" onClick={openCreate}>
                    <Plus className="size-4" />
                    Novo Usuario
                  </Button>
                }
              />

              {isLoading ? (
                <TableSkeleton />
              ) : isError ? (
                <div className="py-16 text-center text-sm text-red-500">
                  {error instanceof Error
                    ? error.message
                    : "Erro ao carregar os usuarios. Tente novamente."}
                </div>
              ) : users.length === 0 ? (
                <EmptyState
                  icon={Users}
                  message={
                    hasFilters
                      ? "Nenhum usuario encontrado com os filtros aplicados."
                      : "Nenhum usuario cadastrado ate o momento."
                  }
                />
              ) : (
                <UsersTable
                  users={users}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              )}
            </div>
          </SplitViewMain>

          <SplitViewPanel className="flex flex-col pl-6">
            <SplitViewPanelHeader
              title={editUser ? "Editar Usuario" : "Novo Usuario"}
              subtitle={
                editUser
                  ? "Altere os dados do usuario abaixo."
                  : "Preencha os dados para criar um novo usuario."
              }
              onClose={closePanel}
            />

            <div className="flex-1 overflow-y-auto py-6">
              <UserFormPanel
                user={editUser}
                isSubmitting={
                  editUser ? updateMutation.isPending : createMutation.isPending
                }
                onSubmit={(values) => {
                  if (editUser) {
                    updateMutation.mutate({ id: editUser.id, ...values });
                  } else {
                    createMutation.mutate(values);
                  }
                }}
                onCancel={closePanel}
              />
            </div>
          </SplitViewPanel>
        </SplitView>
      </main>

      <UserDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        userName={deleteTarget?.name ?? ""}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </>
  );
}
