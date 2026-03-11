import { Building2 } from "lucide-react";

import { BlocksTable } from "@/components/blocks/blocks-table";
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
import type { BlockSummary } from "@/services/rooms/types";

interface TabBlocksProps {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  blocks: BlockSummary[];
  hasFilters: boolean;
  onEdit: (block: BlockSummary) => void;
  onDelete: (block: BlockSummary) => void;
  onCreateBlock: () => void;
}

export function TabBlocks({
  isLoading,
  isError,
  error,
  blocks,
  hasFilters,
  onEdit,
  onDelete,
  onCreateBlock,
}: TabBlocksProps) {
  if (isLoading) return <TableSkeleton />;

  if (isError) {
    return (
      <div className="py-16 text-center text-sm text-red-500">
        {error instanceof Error
          ? error.message
          : "Erro ao carregar os blocos."}
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 />
          </EmptyMedia>
          <EmptyTitle>Nenhum bloco encontrado</EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? "Nenhum bloco encontrado com os filtros aplicados."
              : "Nenhum bloco cadastrado ate o momento."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          <Button variant="hover" onClick={onCreateBlock}>
            Cadastrar bloco
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <BlocksTable blocks={blocks} onEdit={onEdit} onDelete={onDelete} />
  );
}
