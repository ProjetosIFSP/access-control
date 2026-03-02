import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type { ProfileSummary } from "@/services/profiles/types";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const columnHelper = createColumnHelper<ProfileSummary>();

const columns = [
  columnHelper.accessor("name", {
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Perfil
        <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: () => null,
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: () => null,
  }),
];

interface ProfilesTableProps {
  profiles: ProfileSummary[];
  onEdit: (profile: ProfileSummary) => void;
  onDelete: (profile: ProfileSummary) => void;
}

export function ProfilesTable({ profiles, onEdit, onDelete }: ProfilesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: profiles,
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
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const profile = row.original;
            return (
              <TableRow key={row.id}>
                <TableCell className="w-full py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                      {profile.name}
                    </span>
                    {profile.description && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 leading-tight">
                        {profile.description}
                      </span>
                    )}
                  </div>
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
                        <DropdownMenuItem onClick={() => onEdit(profile)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(profile)}>
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
