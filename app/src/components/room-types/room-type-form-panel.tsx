import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useEffect, useId } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { RoomType } from "@/services/rooms/types";

const roomTypeFormSchema = z.object({
	name: z.string().min(1, "Nome obrigatorio").min(2, "Minimo 2 caracteres"),
	abbreviation: z
		.string()
		.min(1, "Sigla obrigatoria")
		.max(10, "Maximo 10 caracteres")
		.regex(/^[A-Z0-9]+$/, "Apenas letras maiusculas e numeros"),
});

export interface RoomTypeFormValues {
	name: string;
	abbreviation: string;
}

interface RoomTypeFormPanelProps {
	roomType: RoomType | null;
	isSubmitting: boolean;
	onSubmit: (values: RoomTypeFormValues) => void;
	onCancel: () => void;
}

export function RoomTypeFormPanel({
	roomType,
	isSubmitting,
	onSubmit,
	onCancel,
}: RoomTypeFormPanelProps) {
	const id = useId();
	const isEditing = roomType !== null;

	const form = useForm({
		defaultValues: {
			name: roomType?.name ?? "",
			abbreviation: roomType?.abbreviation ?? "",
		},
		onSubmit: async ({ value }) => {
			onSubmit(value);
		},
	});

	useEffect(() => {
		form.reset({
			name: roomType?.name ?? "",
			abbreviation: roomType?.abbreviation ?? "",
		});
	}, [roomType, form]);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="flex flex-col gap-5"
		>
			<form.Field
				name="name"
				validators={{
					onChange: ({ value }) => {
						const r = roomTypeFormSchema.shape.name.safeParse(value);
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
							placeholder="Ex: Laboratorio de Informatica"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							onBlur={field.handleBlur}
							aria-invalid={field.state.meta.errors.length > 0}
							className="bg-white dark:bg-zinc-900"
						/>
					</FormField>
				)}
			</form.Field>

			<form.Field
				name="abbreviation"
				validators={{
					onChange: ({ value }) => {
						const r = roomTypeFormSchema.shape.abbreviation.safeParse(value);
						return r.success ? undefined : r.error.issues[0]?.message;
					},
				}}
			>
				{(field) => (
					<FormField
						label="Sigla"
						htmlFor={`${id}-abbreviation`}
						error={field.state.meta.errors[0]?.toString()}
					>
						<Input
							id={`${id}-abbreviation`}
							placeholder="Ex: LINF"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
							onBlur={field.handleBlur}
							aria-invalid={field.state.meta.errors.length > 0}
							className="bg-white dark:bg-zinc-900 font-mono"
							maxLength={10}
						/>
					</FormField>
				)}
			</form.Field>

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
