import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus, ShieldCheck, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";
import { ProfileDeleteDialog } from "@/components/profiles/profile-delete-dialog";
import { ProfileFormPanel } from "@/components/profiles/profile-form-panel";
import { ProfilesTable } from "@/components/profiles/profiles-table";
import { Button } from "@/components/ui/button";
import { CrudPageHeader } from "@/components/ui/crud-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { SelectFilter } from "@/components/ui/select-filter";
import {
	SplitView,
	SplitViewMain,
	SplitViewPanel,
} from "@/components/ui/split-view";
import { SplitViewPanelHeader } from "@/components/ui/split-view-panel-header";
import { TabButton } from "@/components/ui/tab-button";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { UserDeleteDialog } from "@/components/users/user-delete-dialog";
import { UserFormPanel } from "@/components/users/user-form-panel";
import { UsersTable } from "@/components/users/users-table";
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

// ── Route ─────────────────────────────────────────────────────────────────────

type ActiveTab = "users" | "profiles";

export const Route = createFileRoute("/users")({
	validateSearch: (search: Record<string, unknown>) => ({
		q: typeof search.q === "string" ? search.q : undefined,
		profileIds: Array.isArray(search.profileIds)
			? (search.profileIds as string[]).filter(Boolean)
			: typeof search.profileIds === "string" && search.profileIds.trim()
				? search.profileIds.split(",").filter(Boolean)
				: undefined,
		tab: (search.tab === "profiles"
			? "profiles"
			: search.tab === "users"
				? "users"
				: undefined) as ActiveTab | undefined,
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
	loaderDeps: ({ search: { q, profileIds } }) => ({ q, profileIds }),
	loader: ({ context, deps: { q, profileIds } }) =>
		Promise.all([
			context.queryClient.ensureQueryData(usersQueryOptions({ q, profileIds })),
			context.queryClient.ensureQueryData(profilesQueryOptions),
			context.queryClient.ensureQueryData(roomsAdminQueryOptions()),
			context.queryClient.ensureQueryData(roomTypesQueryOptions),
		]),
	component: UsersProfilesPage,
});

// ── Component ─────────────────────────────────────────────────────────────────

function UsersProfilesPage() {
	const { q, tab: tabParam, profileIds: profileIdsParam } = Route.useSearch();
	const navigate = Route.useNavigate();
	const queryClient = useQueryClient();

	const [activeTab, setActiveTab] = useState<ActiveTab>(tabParam ?? "users");
	const [inputValue, setInputValue] = useState(
		activeTab === "users" ? (q ?? "") : "",
	);
	const debouncedQ = useDebounce(inputValue, 400);
	const syncMounted = useRef(false);
	const tabMounted = useRef(false);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Filter state
	const [selectedProfileId, setSelectedProfileId] = useState<string>(
		profileIdsParam?.[0] ?? "all",
	);

	// ── Panel state — single discriminated union replaces 4 booleans/nulls ─────
	type PanelMode =
		| { kind: "none" }
		| { kind: "createUser" }
		| { kind: "editUser"; item: UserSummary }
		| { kind: "createProfile" }
		| { kind: "editProfile"; item: ProfileSummary };

	const [panelMode, setPanelMode] = useState<PanelMode>({ kind: "none" });

	const panelVisible = panelMode.kind !== "none";

	const userFormOpen =
		panelMode.kind === "createUser" || panelMode.kind === "editUser";
	const editUser = panelMode.kind === "editUser" ? panelMode.item : null;

	const profileFormOpen =
		panelMode.kind === "createProfile" || panelMode.kind === "editProfile";
	const editProfile = panelMode.kind === "editProfile" ? panelMode.item : null;

	// Delete targets remain independent (dialogs can be open alongside panel)
	const [deleteUserTarget, setDeleteUserTarget] = useState<UserSummary | null>(
		null,
	);
	const [deleteProfileTarget, setDeleteProfileTarget] =
		useState<ProfileSummary | null>(null);

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

	// Sync debounced search + profileIds to URL (users tab only)
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional
	useEffect(() => {
		if (!syncMounted.current) {
			syncMounted.current = true;
			return;
		}
		if (activeTab !== "users") return;
		navigate({
			search: (prev) => ({
				...prev,
				q: debouncedQ.trim() || undefined,
				profileIds:
					selectedProfileId !== "all" ? [selectedProfileId] : undefined,
			}),
			replace: true,
		});
	}, [debouncedQ, selectedProfileId]);

	// Reset filters + URL when switching tabs
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally resets on tab change
	useEffect(() => {
		if (!tabMounted.current) {
			tabMounted.current = true;
			return;
		}
		setInputValue("");
		setSelectedProfileId("all");
		closePanel();
		navigate({
			search: (prev) => ({
				...prev,
				tab: activeTab === "users" ? undefined : (activeTab as ActiveTab),
				q: undefined,
				profileIds: undefined,
			}),
			replace: true,
		});
	}, [activeTab]);

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

	// ── Queries ─────────────────────────────────────────────────────────────────

	const {
		data: usersData,
		isLoading: usersLoading,
		isError: usersError,
		error: usersErrorObj,
	} = useQuery(usersQueryOptions({ q, profileIds: profileIdsParam }));

	const {
		data: profilesData,
		isLoading: profilesLoading,
		isError: profilesError,
		error: profilesErrorObj,
	} = useQuery(profilesQueryOptions);

	const allUsers = usersData?.result ?? [];
	const allProfiles = profilesData?.result ?? [];

	// Memoize lower-cased query to avoid repeated .toLowerCase() calls
	const lowerDebouncedQ = debouncedQ.toLowerCase();

	const filteredProfiles = useMemo(() => {
		if (!debouncedQ.trim()) return allProfiles;
		return allProfiles.filter(
			(p) =>
				p.name.toLowerCase().includes(lowerDebouncedQ) ||
				p.description.toLowerCase().includes(lowerDebouncedQ),
		);
	}, [allProfiles, debouncedQ, lowerDebouncedQ]);

	// hasFilters: use only the URL param (q) — debouncedQ is the local input
	// mirror before it syncs to URL, so using both was redundant.
	const hasFilters = !!q?.trim() || selectedProfileId !== "all";
	const activeFiltersCount = selectedProfileId !== "all" ? 1 : 0;

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

	// ── Panel header (memoized) ───────────────────────────────────────────────────

	const panelTitle = useMemo(() => {
		switch (panelMode.kind) {
			case "createUser":
				return "Novo Usuario";
			case "editUser":
				return "Editar Usuario";
			case "createProfile":
				return "Novo Perfil";
			case "editProfile":
				return "Editar Perfil";
			default:
				return "";
		}
	}, [panelMode.kind]);

	const panelSubtitle = useMemo(() => {
		switch (panelMode.kind) {
			case "createUser":
				return "Preencha os dados para criar um novo usuario.";
			case "editUser":
				return "Altere os dados do usuario abaixo.";
			case "createProfile":
				return "Preencha os dados para criar um novo perfil.";
			case "editProfile":
				return "Altere os dados do perfil abaixo.";
			default:
				return "";
		}
	}, [panelMode.kind]);

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
							<CrudPageHeader
								title="Usuarios e Perfis"
								subtitle="Gerencie os usuarios e perfis de acesso cadastrados no sistema."
							/>

							{/* Tabs */}
							<div className="flex items-center gap-1">
								<TabButton
									active={activeTab === "users"}
									onClick={() => setActiveTab("users")}
									label="Usuarios"
									count={allUsers.length}
								/>
								<TabButton
									active={activeTab === "profiles"}
									onClick={() => setActiveTab("profiles")}
									label="Perfis"
									count={allProfiles.length}
								/>
							</div>

							<div className="flex items-center justify-between gap-3 w-full">
								<div className="flex items-center gap-3 flex-1 min-w-0">
									<SearchToolbar
										value={inputValue}
										onChange={setInputValue}
										inputRef={searchInputRef}
										placeholder={
											activeTab === "users"
												? "Buscar por nome ou e-mail..."
												: "Buscar por nome ou descricao..."
										}
									/>
									{activeTab === "users" && profileOptions.length > 0 && (
										<FilterBar
											activeCount={activeFiltersCount}
											panelOpen={panelVisible}
										>
											<SelectFilter
												value={selectedProfileId}
												onValueChange={setSelectedProfileId}
												placeholder="Perfil de acesso"
												options={profileOptions}
											/>
										</FilterBar>
									)}
								</div>
								<div className="flex-shrink-0">
									{activeTab === "users" ? (
										<Button
											size={panelVisible ? "icon" : "sm"}
											variant="hover"
											onClick={openCreateUser}
											className={
												!panelVisible ? "max-sm:px-2 max-sm:w-9 max-sm:h-9" : ""
											}
										>
											<Plus className="size-4" />
											<span
												className={`hidden ${!panelVisible ? "sm:inline" : ""}`}
											>
												Novo Usuario
											</span>
										</Button>
									) : (
										<Button
											size={panelVisible ? "icon" : "sm"}
											variant="hover"
											onClick={openCreateProfile}
											className={
												!panelVisible ? "max-sm:px-2 max-sm:w-9 max-sm:h-9" : ""
											}
										>
											<Plus className="size-4" />
											<span
												className={`hidden ${!panelVisible ? "sm:inline" : ""}`}
											>
												Novo Perfil
											</span>
										</Button>
									)}
								</div>
							</div>

							{/* Users tab */}
							{activeTab === "users" &&
								(usersLoading ? (
									<TableSkeleton />
								) : usersError ? (
									<div className="py-16 text-center text-sm text-red-500">
										{usersErrorObj instanceof Error
											? usersErrorObj.message
											: "Erro ao carregar os usuarios. Tente novamente."}
									</div>
								) : allUsers.length === 0 ? (
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
										users={allUsers}
										onEdit={openEditUser}
										onDelete={setDeleteUserTarget}
									/>
								))}

							{/* Profiles tab */}
							{activeTab === "profiles" &&
								(profilesLoading ? (
									<TableSkeleton />
								) : profilesError ? (
									<div className="py-16 text-center text-sm text-red-500">
										{profilesErrorObj instanceof Error
											? profilesErrorObj.message
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
										onEdit={openEditProfile}
										onDelete={setDeleteProfileTarget}
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
							{(userFormOpen || editUser) && (
								<UserFormPanel
									user={editUser}
									isSubmitting={
										editUser
											? updateUserMutation.isPending
											: createUserMutation.isPending
									}
									onSubmit={(values) => {
										if (editUser) {
											updateUserMutation.mutate({ id: editUser.id, ...values });
										} else {
											createUserMutation.mutate(values);
										}
									}}
									onCancel={closePanel}
								/>
							)}
							{(profileFormOpen || editProfile) && (
								<ProfileFormPanel
									profile={editProfile}
									isSubmitting={
										editProfile
											? updateProfileMutation.isPending
											: createProfileMutation.isPending
									}
									onSubmit={(values) => {
										if (editProfile)
											updateProfileMutation.mutate({
												id: editProfile.id,
												...values,
											});
										else createProfileMutation.mutate(values);
									}}
									onCancel={closePanel}
								/>
							)}
						</div>
					</SplitViewPanel>
				</SplitView>
			</main>

			<UserDeleteDialog
				open={deleteUserTarget !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteUserTarget(null);
				}}
				userName={deleteUserTarget?.name ?? ""}
				isDeleting={deleteUserMutation.isPending}
				onConfirm={() => {
					if (deleteUserTarget) deleteUserMutation.mutate(deleteUserTarget.id);
				}}
			/>

			<ProfileDeleteDialog
				open={deleteProfileTarget !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteProfileTarget(null);
				}}
				profile={deleteProfileTarget}
				isDeleting={deleteProfileMutation.isPending}
				onConfirm={() => {
					if (deleteProfileTarget)
						deleteProfileMutation.mutate(deleteProfileTarget.id);
				}}
			/>
		</>
	);
}
