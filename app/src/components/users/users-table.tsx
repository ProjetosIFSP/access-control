import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowUpDown,
	KeyRound,
	MoreHorizontal,
	Pencil,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import type { UserSummary } from "@/services/users/types";

// ── Column Definitions ───────────────────────────────────────────────────────

const columnHelper = createColumnHelper<UserSummary>();

const columns = [
	columnHelper.accessor("name", {
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="sm"
				className="-ml-3"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			>
				Usuário
				<ArrowUpDown className="ml-1 size-3" />
			</Button>
		),
		cell: () => null, // rendered manually below
	}),
	columnHelper.display({
		id: "actions",
		header: "",
		cell: () => null, // rendered manually below
	}),
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface UsersTableProps {
	users: UserSummary[];
	onEdit: (user: UserSummary) => void;
	onDelete: (user: UserSummary) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UsersTable({ users, onEdit, onDelete }: UsersTableProps) {
	const [sorting, setSorting] = useState<SortingState>([]);

	const table = useReactTable({
		data: users,
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
						const user = row.original;
						return (
							<TableRow key={row.id}>
								{/* ── User cell ─────────────────────────────────── */}
								<TableCell className="w-full py-3">
									<div className="flex flex-col gap-0.5">
										{/* Top row: name + type badge */}
										<div className="flex items-center gap-2">
											<span className="font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
												{user.name}
											</span>
											{user.isAdmin ? (
												<Badge className="gap-1 py-0 px-1.5 text-[10px] bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800">
													<ShieldCheck className="size-2.5" />
													Admin
												</Badge>
											) : (
												<Badge
													variant="secondary"
													className="py-0 px-1.5 text-[10px]"
												>
													Usuário
												</Badge>
											)}
										</div>

										{/* Bottom row: email */}
										<span className="text-xs text-zinc-400 dark:text-zinc-500 leading-tight">
											{user.email}
										</span>
									</div>
								</TableCell>

								{/* ── Actions cell ───────────────────────────────── */}
								<TableCell className="py-3 pr-4 pl-2">
									<div className="flex flex-col items-end justify-between gap-3 h-full min-h-[2.75rem]">
										{/* Top-right: lock icon if has credentials */}
										<div className="h-4 flex items-center">
											{user.hasCredentials && (
												<KeyRound className="size-3 text-emerald-500 dark:text-emerald-400" />
											)}
										</div>

										{/* Bottom-right: actions menu */}
										<RowActions
											user={user}
											onEdit={onEdit}
											onDelete={onDelete}
										/>
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

// ── Row Actions ───────────────────────────────────────────────────────────────

function RowActions({
	user,
	onEdit,
	onDelete,
}: {
	user: UserSummary;
	onEdit: (u: UserSummary) => void;
	onDelete: (u: UserSummary) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon-xs">
					<MoreHorizontal className="size-4" />
					<span className="sr-only">Ações</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => onEdit(user)}>
					<Pencil className="size-4" />
					Editar
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive" onClick={() => onDelete(user)}>
					<Trash2 className="size-4" />
					Excluir
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
