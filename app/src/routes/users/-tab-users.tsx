import { Users } from "lucide-react";

import { UsersTable } from "@/components/users/users-table";
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
import type { UserSummary } from "@/services/users/types";

interface UsersTabProps {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  users: UserSummary[];
  hasFilters: boolean;
  totalUsers: number;
  totalPages: number;
  currentPage: number;
  paginationPages: (number | "ellipsis")[];
  onEdit: (user: UserSummary) => void;
  onDelete: (user: UserSummary) => void;
  onManageFingerprints: (user: UserSummary) => void;
  onCreateUser: () => void;
  onGoToPage: (page: number) => void;
}

export function UsersTab({
  isLoading,
  isError,
  error,
  users,
  hasFilters,
  totalUsers,
  totalPages,
  currentPage,
  paginationPages,
  onEdit,
  onDelete,
  onManageFingerprints,
  onCreateUser,
  onGoToPage,
}: UsersTabProps) {
  if (isLoading) return <TableSkeleton />;

  if (isError) {
    return (
      <div className="py-16 text-center text-sm text-red-500">
        {error instanceof Error
          ? error.message
          : "Erro ao carregar os usuarios. Tente novamente."}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>Nenhum usuário encontrado</EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? "Nenhum usuario encontrado com os filtros aplicados."
              : "Nenhum usuario cadastrado ate o momento."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          <Button variant="hover" onClick={onCreateUser}>
            Cadastrar usuário
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <UsersTable
        users={users}
        onEdit={onEdit}
        onDelete={onDelete}
        onManageFingerprints={onManageFingerprints}
      />
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-sm text-muted-foreground">
            {totalUsers} usuário{totalUsers !== 1 ? "s" : ""} no total
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
