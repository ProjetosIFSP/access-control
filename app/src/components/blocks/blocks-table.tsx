import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BlockSummary } from "@/services/rooms/types";

const columnHelper = createColumnHelper<BlockSummary>();

const columns = [
	columnHelper.accessor("name", {
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="sm"
				className="-ml-3"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			>
				Bloco
				<ArrowUpDown className="ml-1 size-3" />
			</Button>
		),
		cell: () => null,
	}),
	columnHelper.display({ id: "actions", header: "", cell: () => null }),
];

interface BlocksTableProps {
	blocks: BlockSummary[];
	onEdit: (block: BlockSummary) => void;
	onDelete: (block: BlockSummary) => void;
}

export function BlocksTable({ blocks, onEdit, onDelete }: BlocksTableProps) {
	const [sorting, setSorting] = useState<SortingState>([]);

	const table = useReactTable({
		data: blocks,
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
						const block = row.original;
						return (
							<TableRow key={row.id}>
								<TableCell className="w-full py-3">
									<span className="font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
										{block.name}
									</span>
								</TableCell>
								<TableCell className="py-3 pr-4 pl-2">
									<div className="flex items-center justify-end gap-1">
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="icon-xs"
													onClick={() => onEdit(block)}
												>
													<Pencil className="size-4" />
													<span className="sr-only">Editar</span>
												</Button>
											</TooltipTrigger>
											<TooltipContent>Editar</TooltipContent>
										</Tooltip>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="icon-xs"
													className="text-destructive hover:text-destructive hover:bg-destructive/10"
													onClick={() => onDelete(block)}
												>
													<Trash2 className="size-4" />
													<span className="sr-only">Excluir</span>
												</Button>
											</TooltipTrigger>
											<TooltipContent>Excluir</TooltipContent>
										</Tooltip>
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
