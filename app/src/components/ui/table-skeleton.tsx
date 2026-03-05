// ── TableSkeleton ─────────────────────────────────────────────────────────────

interface TableSkeletonProps {
	/** Number of skeleton rows to render (default: 5) */
	rows?: number;
}

export function TableSkeleton({ rows = 5 }: TableSkeletonProps) {
	return (
		<div className="space-y-3">
			<div className="h-10 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
			{Array.from({ length: rows }).map((_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
					key={i}
					className="h-12 w-full animate-pulse rounded bg-zinc-50 dark:bg-zinc-900"
				/>
			))}
		</div>
	);
}
