import { Tag } from "lucide-react";

import { RoomTypesTable } from "@/components/room-types/room-types-table";
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
import type { RoomType } from "@/services/rooms/types";

interface TabRoomTypesProps {
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	roomTypes: RoomType[];
	hasFilters: boolean;
	onEdit: (roomType: RoomType) => void;
	onDelete: (roomType: RoomType) => void;
	onCreateRoomType: () => void;
}

export function TabRoomTypes({
	isLoading,
	isError,
	error,
	roomTypes,
	hasFilters,
	onEdit,
	onDelete,
	onCreateRoomType,
}: TabRoomTypesProps) {
	if (isLoading) return <TableSkeleton />;

	if (isError) {
		return (
			<div className="py-16 text-center text-sm text-red-500">
				{error instanceof Error
					? error.message
					: "Erro ao carregar os tipos de sala."}
			</div>
		);
	}

	if (roomTypes.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Tag />
					</EmptyMedia>
					<EmptyTitle>Nenhum tipo encontrado</EmptyTitle>
					<EmptyDescription>
						{hasFilters
							? "Nenhum tipo encontrado com os filtros aplicados."
							: "Nenhum tipo de sala cadastrado ate o momento."}
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent className="flex-row justify-center gap-2">
					<Button variant="hover" onClick={onCreateRoomType}>
						Cadastrar tipo
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<RoomTypesTable roomTypes={roomTypes} onEdit={onEdit} onDelete={onDelete} />
	);
}
