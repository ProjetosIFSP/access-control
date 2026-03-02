import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, DoorOpen, DoorClosed, Fingerprint, CreditCard } from "lucide-react";

import type { RoomSummaryAdmin } from "@/services/rooms/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const columnHelper = createColumnHelper<RoomSummaryAdmin>();

const columns = [
  columnHelper.accessor("name", {
    header: ({ column }) => (
      <Button variant="ghost" size="sm" className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Sala <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: () => null,
  }),
  columnHelper.display({ id: "actions", header: "", cell: () => null }),
];

function DoorStateBadge({ state }: { state: string }) {
  const normalized = state?.toUpperCase();
  if (normalized === "OPEN" || normalized === "OPENED") {
    return (
      <Badge className="gap-1 py-0 px-1.5 text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
        <DoorOpen className="size-2.5" /> Aberta
      </Badge>
    );
  }
  if (normalized === "CLOSED") {
    return (
      <Badge className="gap-1 py-0 px-1.5 text-[10px] bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
        <DoorClosed className="size-2.5" /> Fechada
      </Badge>
    );
  }
  return <Badge variant="secondary" className="py-0 px-1.5 text-[10px]">{state ?? "Desconhecido"}</Badge>;
}

interface RoomsTableProps {
  rooms: RoomSummaryAdmin[];
  onEdit: (room: RoomSummaryAdmin) => void;
  onDelete: (room: RoomSummaryAdmin) => void;
}

export function RoomsTable({ rooms, onEdit, onDelete }: RoomsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: rooms, columns,
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
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const room = row.original;
            return (
              <TableRow key={row.id}>
                <TableCell className="w-full py-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 leading-tight">{room.name}</span>
                      <DoorStateBadge state={room.doorState} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 leading-tight">
                      <span>{room.blockName || "—"}</span>
                      {room.typeAbbreviation && <><span>·</span><span>{room.typeAbbreviation}</span></>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3 pr-4 pl-2">
                  <div className="flex flex-col items-end justify-between gap-3 h-full min-h-[2.75rem]">
                    <div className="h-4 flex items-center gap-1.5">
                      {room.requiresBiometry && <Fingerprint className="size-3 text-violet-500 dark:text-violet-400" />}
                      {room.requiresRFID && <CreditCard className="size-3 text-blue-500 dark:text-blue-400" />}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Acoes</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(room)}>
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(room)}>
                          <Trash2 className="size-4" /> Excluir
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
