import { ShieldCheck } from "lucide-react";

import { ProfilesTable } from "@/components/profiles/profiles-table";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import type { ProfileSummary } from "@/services/profiles/types";

interface TabProfilesProps {
	profiles: ProfileSummary[];
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	hasFilters: boolean;
	onEdit: (profile: ProfileSummary) => void;
	onDelete: (profile: ProfileSummary) => void;
	onCreateProfile: () => void;
}

export function TabProfiles({
	profiles,
	isLoading,
	isError,
	error,
	hasFilters,
	onEdit,
	onDelete,
	onCreateProfile,
}: TabProfilesProps) {
	if (isLoading) return <TableSkeleton />;

	if (isError) {
		return (
			<div className="py-16 text-center text-sm text-red-500">
				{error instanceof Error
					? error.message
					: "Erro ao carregar os perfis. Tente novamente."}
			</div>
		);
	}

	if (profiles.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<ShieldCheck />
					</EmptyMedia>
					<EmptyTitle>Nenhum perfil encontrado</EmptyTitle>
					<EmptyDescription>
						{hasFilters
							? "Nenhum perfil encontrado com os filtros aplicados."
							: "Nenhum perfil cadastrado ate o momento."}
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent className="flex-row justify-center gap-2">
					<Button variant="hover" onClick={onCreateProfile}>
						Cadastrar perfil
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<ProfilesTable profiles={profiles} onEdit={onEdit} onDelete={onDelete} />
	);
}
