import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Search, Plus, Users, X } from "lucide-react";
import { toast } from "sonner";

import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMac, useIsMobile as useIsMobileOS } from "@/hooks/use-os";
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
  const isMac = useIsMac();
  const isMobileOS = useIsMobileOS();

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

  // Sync debounced search value → URL
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

  // Ctrl+K → focus search | Escape → close panel
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
      toast.success("Usuário criado com sucesso!");
      closePanel();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      invalidateUsers();
      toast.success("Usuário atualizado com sucesso!");
      closePanel();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      invalidateUsers();
      toast.success("Usuário excluído com sucesso!");
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const users = data?.result ?? [];
  const hasFilters = !!q?.trim();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <main className="flex w-full flex-1 flex-col overflow-hidden px-4 sm:px-8 md:px-16 lg:px-24 py-8">
        <SplitView
          open={panelVisible}
          onOpenChange={(open) => !open && closePanel()}
        >
          {/* ── Main list ─────────────────────────────────────────────── */}
          <SplitViewMain>
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Usuários
                </h1>
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  Gerencie os usuários cadastrados no sistema.
                </p>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative w-full max-w-sm flex-1 min-w-40">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Buscar por nome ou e-mail…"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="pl-9 pr-16 bg-white dark:bg-zinc-950"
                  />
                  {!isMobileOS && (
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
                      <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                      <Kbd>K</Kbd>
                    </div>
                  )}
                </div>

                {/* New user button */}
                <Button size="sm" variant="hover" onClick={openCreate}>
                  <Plus className="size-4" />
                  Novo Usuário
                </Button>
              </div>

              {/* Table / empty / error states */}
              {isLoading ? (
                <TableSkeleton />
              ) : isError ? (
                <div className="py-16 text-center text-sm text-red-500">
                  {error instanceof Error
                    ? error.message
                    : "Erro ao carregar os usuários. Tente novamente."}
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <Users className="size-8 text-zinc-200" />
                  <p className="text-sm text-zinc-500">
                    {hasFilters
                      ? "Nenhum usuário encontrado com os filtros aplicados."
                      : "Nenhum usuário cadastrado até o momento."}
                  </p>
                </div>
              ) : (
                <UsersTable
                  users={users}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              )}
            </div>
          </SplitViewMain>

          {/* ── Side panel ────────────────────────────────────────────── */}
          <SplitViewPanel className="flex flex-col pl-6">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b py-4 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {editUser ? "Editar Usuário" : "Novo Usuário"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {editUser
                    ? "Altere os dados do usuário abaixo."
                    : "Preencha os dados para criar um novo usuário."}
                </p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={closePanel}>
                <X className="size-4" />
                <span className="sr-only">Fechar</span>
              </Button>
            </div>

            {/* Panel form */}
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

      <Footer />

      {/* Delete confirmation dialog */}
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-10 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
          key={i}
          className="h-12 w-full animate-pulse rounded bg-zinc-50 dark:bg-zinc-900"
        />
      ))}
    </div>
  );
}
