import { DoorOpen } from "lucide-react";

import { RoomsTable } from "@/components/rooms-admin/rooms-table";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import type { RoomSummaryAdmin } from "@/services/rooms/types";

interface TabRoomsProps {
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	rooms: RoomSummaryAdmin[];
	hasFilters: boolean;
	totalRooms: number;
	totalPages: number;
	currentPage: number;
	paginationPages: (number | "ellipsis")[];
	onEdit: (room: RoomSummaryAdmin) => void;
	onDelete: (room: RoomSummaryAdmin) => void;
	onCreateRoom: () => void;
	onGoToPage: (page: number) => void;
}

export function TabRooms({
	isLoading,
	isError,
	error,
	rooms,
	hasFilters,
	totalRooms,
	totalPages,
	currentPage,
	paginationPages,
	onEdit,
	onDelete,
	onCreateRoom,
	onGoToPage,
}: TabRoomsProps) {
	if (isLoading) return <TableSkeleton />;

	if (isError) {
		return (
			<div className="py-16 text-center text-sm text-red-500">
				{error instanceof Error ? error.message : "Erro ao carregar as salas."}
			</div>
		);
	}

	if (rooms.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<DoorOpen />
					</EmptyMedia>
					<EmptyTitle>Nenhuma sala encontrada</EmptyTitle>
					<EmptyDescription>
						{hasFilters
							? "Nenhuma sala encontrada com os filtros aplicados."
							: "Nenhuma sala cadastrada ate o momento."}
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent className="flex-row justify-center gap-2">
					<Button variant="hover" onClick={onCreateRoom}>
						Cadastrar sala
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<>
			<RoomsTable rooms={rooms} onEdit={onEdit} onDelete={onDelete} />
			{totalPages > 1 && (
				<div className="flex items-center justify-between gap-4 pt-2">
					<p className="text-sm text-muted-foreground">
						{totalRooms} sala{totalRooms !== 1 ? "s" : ""} no total
					</p>
					<Pagination className="mx-0 w-auto">
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									onClick={
										currentPage > 1
											? () => onGoToPage(currentPage - 1)
											: undefined
									}
									aria-disabled={currentPage <= 1}
									className={
										currentPage <= 1
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
								/>
							</PaginationItem>
							{paginationPages.map((p, i) =>
								p === "ellipsis" ? (
									<PaginationItem
										key={`ellipsis-${i < paginationPages.length / 2 ? "start" : "end"}`}
									>
										<PaginationEllipsis />
									</PaginationItem>
								) : (
									<PaginationItem key={p}>
										<PaginationLink
											isActive={p === currentPage}
											onClick={() => onGoToPage(p)}
											className="cursor-pointer"
										>
											{p}
										</PaginationLink>
									</PaginationItem>
								),
							)}
							<PaginationItem>
								<PaginationNext
									onClick={
										currentPage < totalPages
											? () => onGoToPage(currentPage + 1)
											: undefined
									}
									aria-disabled={currentPage >= totalPages}
									className={
										currentPage >= totalPages
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}
		</>
	);
}
