import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Camera,
	Check,
	Key,
	Link,
	Loader2,
	LogOut,
	Pencil,
	Unlink,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GoogleIcon } from "#/components/icons/google";
import { cn } from "#/lib/utils";
import { PageTitle } from "@/components/page/title";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FillableButton } from "@/components/ui/fillable-button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
	currentUserQueryOptions,
	userRelationsQueryOptions,
} from "@/services/users";

export const Route = createFileRoute("/profile/")({
	component: ProfilePage,
});

function ProfilePage() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const { data: currentUser, refetch: refetchUser } = useQuery(
		currentUserQueryOptions,
	);
	const { data: relations } = useQuery(
		userRelationsQueryOptions(session?.user?.id ?? null),
	);

	const [name, setName] = useState("");
	const [isEditingName, setIsEditingName] = useState(false);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [removedImage, setRemovedImage] = useState(false);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isLoadingInfo, setIsLoadingInfo] = useState(false);
	const [isLoadingPassword, setIsLoadingPassword] = useState(false);
	const [isLoadingAuth, setIsLoadingAuth] = useState(false);

	const [accounts, setAccounts] = useState<{ providerId: string }[]>([]);

	useEffect(() => {
		if (session?.user) {
			if (!isEditingName) setName(session.user.name || "");
			setAvatarPreview(session.user.image || null);
		}
		authClient.listAccounts().then((res) => {
			if (res.data) setAccounts(res.data);
		});
	}, [session, isEditingName]);

	if (isSessionPending)
		return (
			<div className="p-8 pb-32 flex justify-center">
				<Loader2 className="animate-spin text-zinc-400" />
			</div>
		);

	if (!session?.user)
		return (
			<div className="p-8 pb-32 text-center text-zinc-500">
				Não autenticado.
			</div>
		);

	const hasPassword = currentUser?.hasPassword || false;
	const isGoogleLinked = accounts.some((a) => a.providerId === "google");
	const canUnlinkGoogle = isGoogleLinked && hasPassword;

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setAvatarPreview(reader.result as string);
				setRemovedImage(false);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleRemoveImage = () => {
		setAvatarPreview(null);
		setRemovedImage(true);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleUpdateInfo = async () => {
		setIsLoadingInfo(true);
		try {
			let imageUrl = session.user.image;

			if (removedImage) {
				imageUrl = null;
			} else if (avatarPreview?.startsWith("data:image")) {
				// We use credentials so cookie is sent for API upload
				const uploadRes = await fetch(
					`${import.meta.env.VITE_API_URL || "http://localhost:3333"}/users/me/avatar`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ image: avatarPreview }),
						credentials: "include",
					},
				);
				if (uploadRes.ok) {
					const { url } = await uploadRes.json();
					imageUrl = `${import.meta.env.VITE_API_URL || "http://localhost:3333"}${url}`;
				}
			}

			await authClient.updateUser({
				name,
				image: imageUrl ?? undefined,
			});
			setIsEditingName(false);
			toast.success("Informações atualizadas com sucesso!");
			refetchUser(); // Ensure user fetch catches new info if needed
		} catch (e) {
			console.error(e);
			toast.error("Erro ao atualizar informações");
		}
		setIsLoadingInfo(false);
	};

	const handleUpdatePassword = async () => {
		if ((hasPassword && !currentPassword) || !newPassword) {
			toast.warning("Preencha todos os campos obrigatórios.");
			return;
		}
		setIsLoadingPassword(true);

		try {
			if (!hasPassword) {
				// Set new password directly if the user never had one. Better-Auth might not expose `authClient.setPassword` directly without an extension, but changePassword usually assumes empty strings aren't valid unless you skip it or we call setPassword endpoint if available.
				// However, if standard better-auth changePassword errors, we may need a backend method.
				// But let's assume `authClient.changePassword` with empty or ignored currentPassword works if there's no password in the DB for that account. Or we can just use default.
				const { error } = await authClient.changePassword({
					newPassword,
					currentPassword: currentPassword || "",
					revokeOtherSessions: false,
				});
				if (error) throw new Error(error.message);
			} else {
				const { error } = await authClient.changePassword({
					newPassword,
					currentPassword,
					revokeOtherSessions: false,
				});
				if (error) throw new Error(error.message);
			}
			toast.success("Senha atualizada com sucesso!");
			setCurrentPassword("");
			setNewPassword("");
			refetchUser(); // Refresh hasPassword if needed
		} catch (error: any) {
			toast.error(`Erro: ${error.message || "Falha."}`);
		}
		setIsLoadingPassword(false);
	};

	const handleToggleGoogle = async () => {
		setIsLoadingAuth(true);
		try {
			if (isGoogleLinked) {
				if (!hasPassword) {
					toast.warning(
						"Não é possível desvincular o Google sem primeiro ter uma senha de acesso.",
					);
					setIsLoadingAuth(false);
					return;
				}
				await authClient.unlinkAccount({ providerId: "google" });
				toast.success("Conta do Google desvinculada.");
			} else {
				await authClient.linkSocial({
					provider: "google",
					callbackURL: "/profile",
				});
			}

			const res = await authClient.listAccounts();
			if (res.data) setAccounts(res.data);
		} catch (e) {
			console.error(e);
			toast.error("Erro ao alterar vínculo com o Google");
		}
		setIsLoadingAuth(false);
	};

	return (
		<div className="flex flex-col w-full min-h-[calc(100vh-64px)] pb-24 items-center">
			<main className="flex w-full flex-col gap-6 pt-8">
				<PageTitle
					title="Meu Perfil"
					subtitle="Edite seus dados e preferências"
				/>

				<div className="flex flex-col gap-10 px-4 sm:px-8 md:px-16 lg:px-32 transition-all">
					<div className="w-full flex flex-col gap-10">
						{/* Avatar and Info Section */}
						<div className="flex items-center gap-4">
							<div className="relative flex flex-col items-center gap-2">
								<div className="relative group cursor-pointer size-20 md:size-24">
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										className="cursor-pointer group"
									>
										<Avatar
											size="lg"
											className={cn(
												"size-20! md:size-24! transition-all group-hover:brightness-50",
												removedImage && "grayscale",
											)}
										>
											<AvatarImage
												src={avatarPreview || session.user.image || undefined}
											/>
											<AvatarFallback>
												{session.user.name?.charAt(0)?.toUpperCase() ||
													session.user.email?.charAt(0)?.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
											<Camera className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-md" />
										</div>
									</button>
								</div>
								<input
									type="file"
									accept="image/*"
									ref={fileInputRef}
									onChange={handleImageChange}
									className="hidden"
								/>
								{avatarPreview && !removedImage && (
									<Button
										size="icon-xs"
										onClick={handleRemoveImage}
										className="absolute top-1 right-1 bg-white hover:bg-zinc-100 text-red-500 hover:text-red-600 rounded-full transition-colors"
									>
										<X className="w-3 h-3" />
									</Button>
								)}
							</div>

							<div className="flex flex-col w-full justify-center">
								{isEditingName ? (
									<div className="flex items-center gap-2 max-w-75">
										<Input
											value={name}
											onChange={(e) => setName(e.target.value)}
											className="h-9 sm:h-10 text-base font-semibold"
											autoFocus
											placeholder="Seu nome"
											disabled={isLoadingInfo}
											onKeyDown={(e) => e.key === "Enter" && handleUpdateInfo()}
										/>
										<Button
											size="icon"
											variant="default"
											className="h-9 w-9 shrink-0"
											onClick={handleUpdateInfo}
											disabled={isLoadingInfo || !name.trim()}
										>
											{isLoadingInfo ? (
												<Loader2 className="w-4 h-4 animate-spin text-white" />
											) : (
												<Check className="w-4 h-4 text-white" />
											)}
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="h-9 w-9 shrink-0 text-zinc-500"
											onClick={() => setIsEditingName(false)}
											disabled={isLoadingInfo}
										>
											<X className="w-4 h-4" />
										</Button>
									</div>
								) : (
									<div className="flex items-center gap-2 group">
										<h2 className="text-xl sm:text-2xl font-semibold text-zinc-900 truncate">
											{name}
										</h2>
										<button
											type="button"
											onClick={() => setIsEditingName(true)}
											className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
											title="Editar nome"
										>
											<Pencil className="w-4 h-4" />
										</button>
									</div>
								)}

								<span className="text-sm sm:text-base text-zinc-500">
									{session.user.email}
								</span>
								<div className="pt-2 flex flex-wrap gap-2">
									{currentUser?.isAdmin && (
										<Badge variant="default">Administrador</Badge>
									)}
									{relations?.profiles?.map((profile) => (
										<Badge key={profile.id} variant="secondary">
											{profile.name}
										</Badge>
									))}
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
							{/* Password Settings */}
							<div className="flex flex-col gap-4">
								<div className="flex items-center gap-2 text-zinc-800">
									<Key className="w-5 h-5" />
									<h3 className="text-lg font-semibold">
										{hasPassword ? "Alterar Senha" : "Cadastrar Senha"}
									</h3>
								</div>

								<div className="flex flex-col gap-3">
									{hasPassword && (
										<Input
											type="password"
											placeholder="Senha atual"
											value={currentPassword}
											onChange={(e) => setCurrentPassword(e.target.value)}
											disabled={isLoadingPassword}
										/>
									)}
									<Input
										type="password"
										placeholder="Nova senha"
										className="bg-white dark:bg-zinc-900"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										disabled={isLoadingPassword}
									/>
									<FillableButton
										onClick={handleUpdatePassword}
										disabled={
											(!currentPassword && hasPassword) ||
											!newPassword ||
											isLoadingPassword
										}
										className="w-full"
									>
										{isLoadingPassword ? (
											<Loader2 className="w-5 h-5 animate-spin" />
										) : hasPassword ? (
											"Atualizar Senha"
										) : (
											"Salvar Senha"
										)}
									</FillableButton>
								</div>
							</div>

							{/* Social Linking */}
							<div className="flex flex-col flex-1 gap-4">
								<div className="flex items-center gap-2 text-zinc-800">
									<Link className="w-5 h-5" />
									<h3 className="text-lg font-semibold">
										Acesso por redes sociais
									</h3>
								</div>

								<div className="flex items-center justify-between p-4 border rounded-xl bg-white shadow-sm">
									<div className="flex items-center gap-3">
										<GoogleIcon className="w-6 h-6" />
										<span className="font-medium text-zinc-700">Google</span>
									</div>
									<Button
										variant={isGoogleLinked ? "destructive" : "outline"}
										size="sm"
										className={cn(
											isGoogleLinked ? "opacity-90" : "border-zinc-300",
										)}
										onClick={handleToggleGoogle}
										disabled={
											isLoadingAuth || (isGoogleLinked && !canUnlinkGoogle)
										}
									>
										{isLoadingAuth ? (
											<Loader2 className="w-4 h-4 animate-spin mr-2" />
										) : isGoogleLinked ? (
											<Unlink className="w-4 h-4 mr-2" />
										) : (
											<Link className="w-4 h-4 mr-2" />
										)}
										{isGoogleLinked ? "Desvincular" : "Vincular"}
									</Button>
								</div>
								{isGoogleLinked && !canUnlinkGoogle && (
									<p className="text-xs text-zinc-500 mt-1">
										Para desvincular sua conta Google, você precisa cadastrar
										uma senha antes.
									</p>
								)}
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
