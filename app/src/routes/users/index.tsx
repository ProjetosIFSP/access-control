import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { SplitView, SplitViewMain } from "@/components/ui/split-view";
import { useDebounce } from "@/hooks/use-debounce";
import {
  createProfile,
  deleteProfile,
  profileRelationsQueryOptions,
  profilesQueryKeys,
  profilesQueryOptions,
  updateProfile,
} from "@/services/profiles";
import type { ProfileSummary } from "@/services/profiles/types";
import {
  roomsAdminQueryOptions,
  roomTypesQueryOptions,
} from "@/services/rooms";
import {
  createUser,
  currentUserQueryOptions,
  deleteUser,
  updateUser,
  userRelationsQueryOptions,
  usersQueryOptions,
} from "@/services/users";
import type { UserSummary } from "@/services/users/types";

import { UsersDialogs } from "./_dialogs";
import { UsersPageHeader } from "./_header";
import { UsersSidePanel } from "./_side-panel";
import { UsersTabs } from "./_tabs";
import { TabProfiles } from "./_tab-profiles";
import { UsersTab } from "./_tab-users";
import { UsersToolbar } from "./_toolbar";
import { PAGE_SIZE, usersSearchParams } from "./types";
import type { ActiveTab, PanelMode } from "./types";

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/users/")({
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
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        usersQueryOptions({ q: undefined, profileIds: undefined, page: 1 }),
      ),
      context.queryClient.ensureQueryData(profilesQueryOptions),
      context.queryClient.ensureQueryData(roomsAdminQueryOptions()),
      context.queryClient.ensureQueryData(roomTypesQueryOptions),
    ]),
  component: UsersProfilesPage,
});

// ── Component ─────────────────────────────────────────────────────────────────

function UsersProfilesPage() {
  const queryClient = useQueryClient();

  // ── URL state (nuqs) ────────────────────────────────────────────────────────
  const [params, setParams] = useQueryStates(usersSearchParams, {
    history: "replace",
    shallow: false,
    clearOnDefault: true,
  });

  const {
    q,
    tab: activeTab,
    profileIds: paramProfileIds,
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
  const selectedProfileId = paramProfileIds[0] ?? "all";

  const setSelectedProfileId = useCallback(
    (id: string) => {
      setParams({ profileIds: id !== "all" ? [id] : [], page: 1 });
    },
    [setParams],
  );

  // ── Panel state ─────────────────────────────────────────────────────────────
  const [panelMode, setPanelMode] = useState<PanelMode>({ kind: "none" });
  const panelVisible = panelMode.kind !== "none";

  const openCreateUser = useCallback(
    () => setPanelMode({ kind: "createUser" }),
    [],
  );
  const openEditUser = useCallback(
    (user: UserSummary) => setPanelMode({ kind: "editUser", item: user }),
    [],
  );
  const openCreateProfile = useCallback(
    () => setPanelMode({ kind: "createProfile" }),
    [],
  );
  const openEditProfile = useCallback(
    (profile: ProfileSummary) =>
      setPanelMode({ kind: "editProfile", item: profile }),
    [],
  );
  const closePanel = useCallback(() => setPanelMode({ kind: "none" }), []);

  // ── Tab switching ───────────────────────────────────────────────────────────
  const setActiveTab = useCallback(
    (tab: ActiveTab) => {
      setPanelMode({ kind: "none" });
      setInputValue("");
      setParams({
        tab: tab === "users" ? null : tab,
        q: null,
        profileIds: null,
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
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserSummary | null>(
    null,
  );
  const [deleteProfileTarget, setDeleteProfileTarget] =
    useState<ProfileSummary | null>(null);
  const [fingerprintTarget, setFingerprintTarget] =
    useState<UserSummary | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorObj,
  } = useQuery(
    usersQueryOptions({
      q: debouncedInput.trim() || undefined,
      profileIds: paramProfileIds.length ? paramProfileIds : undefined,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
  );

  const totalPages = usersData?.totalPages ?? 1;
  const totalUsers = usersData?.total ?? 0;

  const {
    data: profilesData,
    isLoading: profilesLoading,
    isError: profilesError,
    error: profilesErrorObj,
  } = useQuery(profilesQueryOptions);

  const allUsers = usersData?.result ?? [];
  const allProfiles = profilesData?.result ?? [];

  const filteredProfiles = useMemo(() => {
    if (!debouncedInput.trim()) return allProfiles;
    const lower = debouncedInput.toLowerCase();
    return allProfiles.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower),
    );
  }, [allProfiles, debouncedInput]);

  const hasFilters = !!debouncedInput.trim() || selectedProfileId !== "all";
  const activeFiltersCount = selectedProfileId !== "all" ? 1 : 0;

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

  const profileOptions = useMemo(
    () => allProfiles.map((p) => ({ value: p.id, label: p.name })),
    [allProfiles],
  );

  // ── Mutations ────────────────────────────────────────────────────────────────
  const invalidateUsers = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["users", "list"] }),
    [queryClient],
  );
  const invalidateUserRelations = useCallback(
    (userId: string) =>
      queryClient.invalidateQueries({
        queryKey: userRelationsQueryOptions(userId).queryKey,
      }),
    [queryClient],
  );

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      invalidateUsers();
      toast.success("Usuario criado com sucesso!");
      closePanel();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const updateUserMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (_data, variables) => {
      invalidateUsers();
      invalidateUserRelations(variables.id);
      toast.success("Usuario atualizado com sucesso!");
      closePanel();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: (_data, userId) => {
      invalidateUsers();
      invalidateUserRelations(userId);
      toast.success("Usuario excluido com sucesso!");
      setDeleteUserTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const invalidateProfiles = useCallback(
    () => queryClient.invalidateQueries({ queryKey: profilesQueryKeys.all }),
    [queryClient],
  );
  const invalidateProfileRelations = useCallback(
    (profileId: string) =>
      queryClient.invalidateQueries({
        queryKey: profileRelationsQueryOptions(profileId).queryKey,
      }),
    [queryClient],
  );

  const createProfileMutation = useMutation({
    mutationFn: createProfile,
    onSuccess: () => {
      invalidateProfiles();
      toast.success("Perfil criado com sucesso!");
      closePanel();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (_data, variables) => {
      invalidateProfiles();
      invalidateProfileRelations(variables.id);
      toast.success("Perfil atualizado com sucesso!");
      closePanel();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const deleteProfileMutation = useMutation({
    mutationFn: deleteProfile,
    onSuccess: (_data, profileId) => {
      invalidateProfiles();
      invalidateProfileRelations(profileId);
      toast.success("Perfil excluido com sucesso!");
      setDeleteProfileTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <main className="flex w-full flex-1 flex-col overflow-hidden px-4 sm:px-8 md:px-16 lg:px-32 transition-all py-8">
        <SplitView
          open={panelVisible}
          onOpenChange={(open) => !open && closePanel()}
        >
          <SplitViewMain>
            <div className="flex flex-col gap-6">
              <UsersPageHeader />

              <UsersTabs
                activeTab={activeTab}
                usersCount={totalUsers}
                profilesCount={allProfiles.length}
                onTabChange={setActiveTab}
              />

              <UsersToolbar
                activeTab={activeTab}
                inputValue={inputValue}
                onSearchChange={handleSearchChange}
                searchInputRef={searchInputRef}
                profileOptions={profileOptions}
                selectedProfileId={selectedProfileId}
                onProfileChange={setSelectedProfileId}
                activeFiltersCount={activeFiltersCount}
                panelVisible={panelVisible}
                onCreateUser={openCreateUser}
                onCreateProfile={openCreateProfile}
              />

              {activeTab === "users" && (
                <UsersTab
                  isLoading={usersLoading}
                  isError={usersError}
                  error={usersErrorObj instanceof Error ? usersErrorObj : null}
                  users={allUsers}
                  hasFilters={hasFilters}
                  totalUsers={totalUsers}
                  totalPages={totalPages}
                  currentPage={currentPage}
                  paginationPages={paginationPages}
                  onEdit={openEditUser}
                  onDelete={setDeleteUserTarget}
                  onManageFingerprints={setFingerprintTarget}
                  onCreateUser={openCreateUser}
                  onGoToPage={goToPage}
                />
              )}

              {activeTab === "profiles" && (
                <TabProfiles
                  profiles={filteredProfiles}
                  isLoading={profilesLoading}
                  isError={profilesError}
                  error={
                    profilesErrorObj instanceof Error ? profilesErrorObj : null
                  }
                  hasFilters={hasFilters}
                  onEdit={openEditProfile}
                  onDelete={setDeleteProfileTarget}
                  onCreateProfile={openCreateProfile}
                />
              )}
            </div>
          </SplitViewMain>

          <UsersSidePanel
            panelMode={panelMode}
            onClose={closePanel}
            isCreatingUser={createUserMutation.isPending}
            isUpdatingUser={updateUserMutation.isPending}
            isCreatingProfile={createProfileMutation.isPending}
            isUpdatingProfile={updateProfileMutation.isPending}
            onSubmitUser={(values) => {
              const editUser =
                panelMode.kind === "editUser" ? panelMode.item : null;
              if (editUser) {
                updateUserMutation.mutate({ id: editUser.id, ...values });
              } else {
                createUserMutation.mutate(values);
              }
            }}
            onSubmitProfile={(values) => {
              const editProfile =
                panelMode.kind === "editProfile" ? panelMode.item : null;
              if (editProfile) {
                updateProfileMutation.mutate({ id: editProfile.id, ...values });
              } else {
                createProfileMutation.mutate(values);
              }
            }}
          />
        </SplitView>
      </main>

      <UsersDialogs
        deleteUserTarget={deleteUserTarget}
        onDeleteUserOpenChange={(open) => {
          if (!open) setDeleteUserTarget(null);
        }}
        isDeletingUser={deleteUserMutation.isPending}
        onConfirmDeleteUser={() => {
          if (deleteUserTarget) deleteUserMutation.mutate(deleteUserTarget.id);
        }}
        deleteProfileTarget={deleteProfileTarget}
        onDeleteProfileOpenChange={(open) => {
          if (!open) setDeleteProfileTarget(null);
        }}
        isDeletingProfile={deleteProfileMutation.isPending}
        onConfirmDeleteProfile={() => {
          if (deleteProfileTarget)
            deleteProfileMutation.mutate(deleteProfileTarget.id);
        }}
        fingerprintTarget={fingerprintTarget}
        onFingerprintOpenChange={(open) => {
          if (!open) {
            setFingerprintTarget(null);
            invalidateUsers();
          }
        }}
      />
    </>
  );
}
