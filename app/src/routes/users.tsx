import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus, ShieldCheck, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ProfileDeleteDialog } from "@/components/profiles/profile-delete-dialog";
import { ProfileFormPanel } from "@/components/profiles/profile-form-panel";
import { ProfilesTable } from "@/components/profiles/profiles-table";
import { Button } from "@/components/ui/button";
import { CrudPageHeader } from "@/components/ui/crud-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import {
	SplitView,
	SplitViewMain,
	SplitViewPanel,
} from "@/components/ui/split-view";
import { SplitViewPanelHeader } from "@/components/ui/split-view-panel-header";
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
	deleteUser,
	fetchCurrentUser,
	updateUser,
	userRelationsQueryOptions,
	usersQueryKeys,
	usersQueryOptions,
} from "@/services/users";
import type { UserSummary } from "@/services/users/types";

// ── Route ─────────────────────────────────────────────────────────────────────

type ActiveTab = "users" | "profiles";

export const Route = createFileRoute("/users")({
	validateSearch: (search: Record<string, unknown>) => ({
		q: typeof search.q === "string" ? search.q : undefined,
		profileIds:
			typeof search.profileIds === "string" && search.profileIds.trim()
				? search.profileIds.split(",").filter(Boolean)
				: undefined,
		tab: (search.tab === "profiles"
			? "profiles"
			: search.tab === "users"
				? "users"
				: undefined) as ActiveTab | undefined,
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
	const isMounted = useRef(false);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Filter state
	const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>(
		profileIdsParam ?? [],
	);

	// ── User panel state ────────────────────────────────────────────────────────
	const [userFormOpen, setUserFormOpen] = useState(false);
	const [editUser, setEditUser] = useState<UserSummary | null>(null);
	const [deleteUserTarget, setDeleteUserTarget] = useState<UserSummary | null>(
		null,
	);

	// ── Profile panel state ─────────────────────────────────────────────────────
	const [profileFormOpen, setProfileFormOpen] = useState(false);
	const [editProfile, setEditProfile] = useState<ProfileSummary | null>(null);
	const [deleteProfileTarget, setDeleteProfileTarget] =
		useState<ProfileSummary | null>(null);

	const panelVisible =
		userFormOpen ||
		editUser !== null ||
		profileFormOpen ||
		editProfile !== null;

	function openCreateUser() {
		setEditUser(null);
		setEditProfile(null);
		setProfileFormOpen(false);
		setUserFormOpen(true);
	}
	function openEditUser(user: UserSummary) {
		setUserFormOpen(false);
		setEditProfile(null);
		setProfileFormOpen(false);
		setEditUser(user);
	}
	function openCreateProfile() {
		setEditProfile(null);
		setEditUser(null);
		setUserFormOpen(false);
		setProfileFormOpen(true);
	}
	function openEditProfile(profile: ProfileSummary) {
		setProfileFormOpen(false);
		setEditUser(null);
		setUserFormOpen(false);
		setEditProfile(profile);
	}

	const closePanel = useCallback(() => {
		setUserFormOpen(false);
		setEditUser(null);
		setProfileFormOpen(false);
		setEditProfile(null);
	}, []);

	// Sync debounced search + profileIds to URL (users tab only)
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional
	useEffect(() => {
		if (!isMounted.current) {
			isMounted.current = true;
			return;
		}
		if (activeTab === "users") {
			navigate({
				search: (prev) => ({
					...prev,
					q: debouncedQ.trim() || undefined,
					profileIds:
						selectedProfileIds.length > 0 ? selectedProfileIds : undefined,
				}),
				replace: true,
			});
		}
	}, [debouncedQ, selectedProfileIds, activeTab]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally resets on tab change
	useEffect(() => {
		setInputValue("");
		setSelectedProfileIds([]);
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

	const filteredProfiles = debouncedQ.trim()
		? allProfiles.filter(
				(p) =>
					p.name.toLowerCase().includes(debouncedQ.toLowerCase()) ||
					p.description.toLowerCase().includes(debouncedQ.toLowerCase()),
			)
		: allProfiles;

	const hasFilters = !!debouncedQ.trim() || !!q?.trim();

	// ── Mutations ────────────────────────────────────────────────────────────────

	const invalidateUsers = () =>
		queryClient.invalidateQueries({ queryKey: usersQueryKeys.all });
	const invalidateUserRelations = (userId: string) =>
		queryClient.invalidateQueries({
			queryKey: userRelationsQueryOptions(userId).queryKey,
		});

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

	const invalidateProfiles = () =>
		queryClient.invalidateQueries({ queryKey: profilesQueryKeys.all });
	const invalidateProfileRelations = (profileId: string) =>
		queryClient.invalidateQueries({
			queryKey: profileRelationsQueryOptions(profileId).queryKey,
		});

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

	// ── Panel header ─────────────────────────────────────────────────────────────

	function getPanelTitle() {
		if (userFormOpen) return "Novo Usuario";
		if (editUser) return "Editar Usuario";
		if (profileFormOpen) return "Novo Perfil";
		if (editProfile) return "Editar Perfil";
		return "";
	}
	function getPanelSubtitle() {
		if (userFormOpen) return "Preencha os dados para criar um novo usuario.";
		if (editUser) return "Altere os dados do usuario abaixo.";
		if (profileFormOpen)
			return "Preencha os dados para criar um novo perfil de acesso.";
		if (editProfile) return "Altere os dados do perfil abaixo.";
		return "";
	}

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
							<div className="flex items-center gap-1 border-b">
								<TabButton
									active={activeTab === "users"}
									onClick={() => setActiveTab("users")}
									icon={<Users className="size-3.5" />}
									label="Usuarios"
									count={allUsers.length}
								/>
								<TabButton
									active={activeTab === "profiles"}
									onClick={() => setActiveTab("profiles")}
									icon={<ShieldCheck className="size-3.5" />}
									label="Perfis"
									count={allProfiles.length}
								/>
							</div>

							<SearchToolbar
								value={inputValue}
								onChange={setInputValue}
								inputRef={searchInputRef}
								placeholder={
									activeTab === "users"
										? "Buscar por nome ou e-mail..."
										: "Buscar por nome ou descricao..."
								}
								actions={
									activeTab === "users" ? (
										<Button size="sm" variant="hover" onClick={openCreateUser}>
											<Plus className="size-4" /> Novo Usuario
										</Button>
									) : (
										<Button
											size="sm"
											variant="hover"
											onClick={openCreateProfile}
										>
											<Plus className="size-4" /> Novo Perfil
										</Button>
									)
								}
							/>

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

					<SplitViewPanel className="flex flex-col pl-6">
						<SplitViewPanelHeader
							title={getPanelTitle()}
							subtitle={getPanelSubtitle()}
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
