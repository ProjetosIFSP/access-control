import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { RoomType } from "@/services/rooms/types";

const columnHelper = createColumnHelper<RoomType>();

const columns = [
	columnHelper.accessor("name", {
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="sm"
				className="-ml-3"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			>
				Tipo
				<ArrowUpDown className="ml-1 size-3" />
			</Button>
		),
		cell: () => null,
	}),
	columnHelper.accessor("abbreviation", {
		header: "Sigla",
		cell: () => null,
	}),
	columnHelper.display({ id: "actions", header: "", cell: () => null }),
];

interface RoomTypesTableProps {
	roomTypes: RoomType[];
	onEdit: (roomType: RoomType) => void;
	onDelete: (roomType: RoomType) => void;
}

export function RoomTypesTable({
	roomTypes,
	onEdit,
	onDelete,
}: RoomTypesTableProps) {
	const [sorting, setSorting] = useState<SortingState>([]);

	const table = useReactTable({
		data: roomTypes,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="rounded-lg border bg-white dark:bg-zinc-950 overflow-hidden">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.map((row) => {
						const roomType = row.original;
						return (
							<TableRow key={row.id}>
								<TableCell className="py-3 w-full">
									<span className="font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
										{roomType.name}
									</span>
								</TableCell>
								<TableCell className="py-3">
									<span className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
										{roomType.abbreviation}
									</span>
								</TableCell>
								<TableCell className="py-3 pr-4 pl-2">
									<div className="flex items-center justify-end">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon-xs">
													<MoreHorizontal className="size-4" />
													<span className="sr-only">Acoes</span>
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => onEdit(roomType)}>
													<Pencil className="size-4" />
													Editar
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													variant="destructive"
													onClick={() => onDelete(roomType)}
												>
													<Trash2 className="size-4" />
													Excluir
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
