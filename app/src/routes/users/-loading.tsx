import { TableSkeleton } from "@/components/ui/table-skeleton";

export function UsersPageSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			{/* Header skeleton */}
			<div className="flex flex-col gap-1.5">
				<div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
				<div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
			</div>

			{/* Tabs skeleton */}
			<div className="flex items-center gap-1">
				<div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
				<div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
			</div>

			{/* Toolbar skeleton */}
			<div className="flex items-center justify-between gap-3">
				<div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
				<div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
			</div>

			{/* Table skeleton */}
			<TableSkeleton />
		</div>
	);
}
