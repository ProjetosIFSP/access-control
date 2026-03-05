import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useId } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { profilesQueryOptions } from "@/services/profiles";
import { roomRelationsQueryOptions } from "@/services/rooms";
import type {
	BlockSummary,
	RoomSummaryAdmin,
	RoomType,
} from "@/services/rooms/types";
import { usersQueryOptions } from "@/services/users";

const roomFormSchema = z.object({
	name: z.string().min(1, "Nome obrigatorio").min(2, "Minimo 2 caracteres"),
	blockId: z.string().min(1, "Bloco obrigatorio"),
	typeId: z.string().min(1, "Tipo obrigatorio"),
	requiresBiometry: z.boolean(),
	requiresRFID: z.boolean(),
});

export interface RoomFormValues {
	name: string;
	blockId: string;
	typeId: string;
	requiresBiometry: boolean;
	requiresRFID: boolean;
	profileIds?: string[];
	userIds?: string[];
}

interface RoomFormPanelProps {
	room: RoomSummaryAdmin | null;
	blocks: BlockSummary[];
	roomTypes: RoomType[];
	isSubmitting: boolean;
	onSubmit: (values: RoomFormValues) => void;
	onCancel: () => void;
}

export function RoomFormPanel({
	room,
	blocks,
	roomTypes,
	isSubmitting,
	onSubmit,
	onCancel,
}: RoomFormPanelProps) {
	const id = useId();
	const isEditing = room !== null;

	// ── Remote data for selectors ────────────────────────────────────────────

	const { data: profilesData } = useQuery(profilesQueryOptions);
	const { data: usersData } = useQuery(usersQueryOptions({}));
	const { data: relationsData } = useQuery(
		roomRelationsQueryOptions(room?.id ?? null),
	);

	const profileOptions = (profilesData?.result ?? []).map((p) => ({
		value: p.id,
		label: p.name,
		sublabel: p.description || undefined,
	}));

	const userOptions = (usersData?.result ?? []).map((u) => ({
		value: u.id,
		label: u.name,
		sublabel: u.email,
	}));

	// ── Form ──────────────────────────────────────────────────────────────────

	const form = useForm({
		defaultValues: {
			name: room?.name ?? "",
			blockId: room?.blockId ?? "",
			typeId: room?.typeId ?? "",
			requiresBiometry: room?.requiresBiometry ?? false,
			requiresRFID: room?.requiresRFID ?? false,
			profileIds: [] as string[],
			userIds: [] as string[],
		},
		onSubmit: async ({ value }) => {
			onSubmit(value);
		},
	});

	useEffect(() => {
		form.reset({
			name: room?.name ?? "",
			blockId: room?.blockId ?? "",
			typeId: room?.typeId ?? "",
			requiresBiometry: room?.requiresBiometry ?? false,
			requiresRFID: room?.requiresRFID ?? false,
			profileIds: relationsData?.profiles.map((p) => p.id) ?? [],
			userIds: relationsData?.users.map((u) => u.id) ?? [],
		});
	}, [room, relationsData, form]);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="flex flex-col gap-5"
		>
			{/* Nome */}
			<form.Field
				name="name"
				validators={{
					onChange: ({ value }) => {
						const r = roomFormSchema.shape.name.safeParse(value);
						return r.success ? undefined : r.error.issues[0]?.message;
					},
				}}
			>
				{(field) => (
					<FormField
						label="Nome"
						htmlFor={`${id}-name`}
						error={field.state.meta.errors[0]?.toString()}
					>
						<Input
							id={`${id}-name`}
							placeholder="Ex: Laboratorio 101"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							onBlur={field.handleBlur}
							aria-invalid={field.state.meta.errors.length > 0}
							className="bg-white dark:bg-zinc-900"
						/>
					</FormField>
				)}
			</form.Field>

			{/* Bloco */}
			<form.Field
				name="blockId"
				validators={{
					onChange: ({ value }) => {
						const r = roomFormSchema.shape.blockId.safeParse(value);
						return r.success ? undefined : r.error.issues[0]?.message;
					},
				}}
			>
				{(field) => (
					<FormField
						label="Bloco"
						htmlFor={`${id}-block`}
						error={field.state.meta.errors[0]?.toString()}
					>
						<Select
							value={field.state.value}
							onValueChange={(v) => field.handleChange(v)}
						>
							<SelectTrigger
								id={`${id}-block`}
								className="bg-white dark:bg-zinc-900 w-full"
								aria-invalid={field.state.meta.errors.length > 0}
							>
								<SelectValue placeholder="Selecione um bloco" />
							</SelectTrigger>
							<SelectContent>
								{blocks.map((block) => (
									<SelectItem key={block.id} value={block.id}>
										{block.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormField>
				)}
			</form.Field>

			{/* Tipo de sala */}
			<form.Field
				name="typeId"
				validators={{
					onChange: ({ value }) => {
						const r = roomFormSchema.shape.typeId.safeParse(value);
						return r.success ? undefined : r.error.issues[0]?.message;
					},
				}}
			>
				{(field) => (
					<FormField
						label="Tipo de Sala"
						htmlFor={`${id}-type`}
						error={field.state.meta.errors[0]?.toString()}
					>
						<Select
							value={field.state.value}
							onValueChange={(v) => field.handleChange(v)}
						>
							<SelectTrigger
								id={`${id}-type`}
								className="bg-white dark:bg-zinc-900 w-full"
								aria-invalid={field.state.meta.errors.length > 0}
							>
								<SelectValue placeholder="Selecione um tipo" />
							</SelectTrigger>
							<SelectContent>
								{roomTypes.map((rt) => (
									<SelectItem key={rt.id} value={rt.id}>
										{rt.name} ({rt.abbreviation})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormField>
				)}
			</form.Field>

			<Separator className="bg-zinc-300 dark:bg-zinc-800" />

			{/* Exige Biometria */}
			<form.Field name="requiresBiometry">
				{(field) => (
					<div className="flex items-center justify-between rounded-lg py-3">
						<div className="flex flex-col gap-0.5">
							<Label htmlFor={`${id}-biometry`} className="cursor-pointer">
								Exige Biometria
							</Label>
							<span className="text-xs text-muted-foreground">
								Acesso requer autenticacao biometrica
							</span>
						</div>
						<Switch
							id={`${id}-biometry`}
							checked={field.state.value}
							onCheckedChange={(checked) => field.handleChange(checked)}
						/>
					</div>
				)}
			</form.Field>

			{/* Exige RFID */}
			<form.Field name="requiresRFID">
				{(field) => (
					<div className="flex items-center justify-between rounded-lg py-3">
						<div className="flex flex-col gap-0.5">
							<Label htmlFor={`${id}-rfid`} className="cursor-pointer">
								Exige RFID
							</Label>
							<span className="text-xs text-muted-foreground">
								Acesso requer cartao/tag RFID
							</span>
						</div>
						<Switch
							id={`${id}-rfid`}
							checked={field.state.value}
							onCheckedChange={(checked) => field.handleChange(checked)}
						/>
					</div>
				)}
			</form.Field>

			<Separator className="bg-zinc-300 dark:bg-zinc-800" />

			{/* Perfis com acesso */}
			<form.Field name="profileIds">
				{(field) => (
					<FormField
						label="Perfis com Acesso"
						htmlFor="room-profiles"
						hint="Perfis de usuarios que terao permissao para acessar esta sala."
					>
						<MultiSelect
							options={profileOptions}
							value={field.state.value}
							onChange={(v) => field.handleChange(v)}
							placeholder="Selecionar perfis..."
							searchPlaceholder="Buscar perfil..."
							emptyMessage="Nenhum perfil encontrado."
						/>
					</FormField>
				)}
			</form.Field>

			{/* Usuarios com acesso direto */}
			<form.Field name="userIds">
				{(field) => (
					<FormField
						label="Usuarios com Acesso Direto"
						htmlFor="room-users"
						hint="Usuarios individuais que terao acesso direto a esta sala."
					>
						<MultiSelect
							options={userOptions}
							value={field.state.value}
							onChange={(v) => field.handleChange(v)}
							placeholder="Selecionar usuarios..."
							searchPlaceholder="Buscar por nome ou e-mail..."
							emptyMessage="Nenhum usuario encontrado."
						/>
					</FormField>
				)}
			</form.Field>

			{/* Actions */}
			<div className="flex items-center gap-2 pt-2">
				<Button
					type="button"
					variant="hoverOutline"
					className="flex-1"
					onClick={onCancel}
					disabled={isSubmitting}
				>
					Cancelar
				</Button>
				<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
					{([canSubmit]) => (
						<Button
							type="submit"
							variant="hover"
							className="flex-1"
							disabled={!canSubmit || isSubmitting}
						>
							{isSubmitting ? (
								<Loader2 className="size-4 animate-spin" />
							) : isEditing ? (
								"Salvar"
							) : (
								"Criar"
							)}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
