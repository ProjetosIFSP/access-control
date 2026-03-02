import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus, ShieldCheck } from "lucide-react";
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

import { ProfilesTable } from "@/components/profiles/profiles-table";
import { ProfileFormPanel } from "@/components/profiles/profile-form-panel";
import { ProfileDeleteDialog } from "@/components/profiles/profile-delete-dialog";

import {
  createProfile,
  deleteProfile,
  profilesQueryKeys,
  profilesQueryOptions,
  updateProfile,
} from "@/services/profiles";
import type { ProfileSummary } from "@/services/profiles/types";

export const Route = createFileRoute("/profiles")({
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
    context.queryClient.ensureQueryData(profilesQueryOptions),
  component: ProfilesPage,
});

function ProfilesPage() {
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState("");
  const debouncedQ = useDebounce(inputValue, 400);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<ProfileSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfileSummary | null>(null);

  const panelVisible = formOpen || editProfile !== null;

  function openCreate() {
    setEditProfile(null);
    setFormOpen(true);
  }
  function openEdit(profile: ProfileSummary) {
    setFormOpen(false);
    setEditProfile(profile);
  }

  const closePanel = useCallback(() => {
    setEditProfile(null);
    setFormOpen(false);
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

  const { data, isLoading, isError, error } = useQuery(profilesQueryOptions);

  const allProfiles = data?.result ?? [];
  const filteredProfiles = debouncedQ.trim()
    ? allProfiles.filter(
        (p) =>
          p.name.toLowerCase().includes(debouncedQ.toLowerCase()) ||
          p.description.toLowerCase().includes(debouncedQ.toLowerCase()),
      )
    : allProfiles;

  const hasFilters = !!debouncedQ.trim();

  const invalidateProfiles = () =>
    queryClient.invalidateQueries({ queryKey: profilesQueryKeys.all });

  const createMutation = useMutation({
    mutationFn: createProfile,
    onSuccess: () => {
      invalidateProfiles();
      toast.success("Perfil criado com sucesso!");
      closePanel();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      invalidateProfiles();
      toast.success("Perfil atualizado com sucesso!");
      closePanel();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      invalidateProfiles();
      toast.success("Perfil excluido com sucesso!");
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
                title="Perfis de Acesso"
                subtitle="Gerencie os perfis que agrupam permissoes de acesso as salas."
              />

              <SearchToolbar
                value={inputValue}
                onChange={setInputValue}
                inputRef={searchInputRef}
                placeholder="Buscar por nome ou descricao..."
                actions={
                  <Button size="sm" variant="hover" onClick={openCreate}>
                    <Plus className="size-4" /> Novo Perfil
                  </Button>
                }
              />

              {isLoading ? (
                <TableSkeleton />
              ) : isError ? (
                <div className="py-16 text-center text-sm text-red-500">
                  {error instanceof Error
                    ? error.message
                    : "Erro ao carregar os perfis. Tente novamente."}
                </div>
              ) : filteredProfiles.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  message={
                    hasFilters
                      ? "Nenhum perfil encontrado com os filtros aplicados."
                      : "Nenhum perfil cadastrado ate o momento."
                  }
                />
              ) : (
                <ProfilesTable
                  profiles={filteredProfiles}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              )}
            </div>
          </SplitViewMain>

          <SplitViewPanel className="flex flex-col pl-6">
            <SplitViewPanelHeader
              title={editProfile ? "Editar Perfil" : "Novo Perfil"}
              subtitle={
                editProfile
                  ? "Altere os dados do perfil abaixo."
                  : "Preencha os dados para criar um novo perfil de acesso."
              }
              onClose={closePanel}
            />
            <div className="flex-1 overflow-y-auto py-6">
              <ProfileFormPanel
                profile={editProfile}
                isSubmitting={
                  editProfile
                    ? updateMutation.isPending
                    : createMutation.isPending
                }
                onSubmit={(values) => {
                  if (editProfile)
                    updateMutation.mutate({ id: editProfile.id, ...values });
                  else createMutation.mutate(values);
                }}
                onCancel={closePanel}
              />
            </div>
          </SplitViewPanel>
        </SplitView>
      </main>

      <ProfileDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        profile={deleteTarget}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </>
  );
}
