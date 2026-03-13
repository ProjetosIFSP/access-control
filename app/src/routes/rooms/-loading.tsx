import { TableSkeleton } from "@/components/ui/table-skeleton";

export function RoomsPageSkeleton() {
	return (
		<main className="flex w-full flex-1 flex-col overflow-hidden px-4 sm:px-8 md:px-16 lg:px-32 transition-all py-8">
			<div className="flex flex-col gap-6">
				{/* Header skeleton */}
				<div className="flex flex-col gap-1.5">
					<div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
					<div className="h-4 w-80 rounded-md bg-muted animate-pulse" />
				</div>

				{/* Tabs skeleton */}
				<div className="flex items-center gap-1">
					<div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
					<div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
					<div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
				</div>

				{/* Toolbar skeleton */}
				<div className="flex items-center justify-between gap-3 w-full">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						<div className="h-9 w-64 rounded-md bg-muted animate-pulse" />
						<div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
					</div>
					<div className="h-9 w-28 rounded-md bg-muted animate-pulse flex-shrink-0" />
				</div>

				{/* Table skeleton */}
				<TableSkeleton />
			</div>
		</main>
	);
}
