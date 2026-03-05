import { SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover";
import { Badge } from "@/components/ui/badge";

// ── FilterBar ─────────────────────────────────────────────────────────────────
//
// Renders filter controls in two modes:
//   • "inline" (panelClosed + wide screen) → shows children directly
//   • "popover" (panel open OR narrow screen) → collapses to an icon button + Popover
//
// Usage:
//   <FilterBar activeCount={n} panelOpen={panelVisible}>
//     <MyFilterControls />
//   </FilterBar>

interface FilterBarProps {
	/** Number of currently active filter values (excluding the text search) */
	activeCount: number;
	/** Whether the split-view panel is visible — triggers compact mode */
	panelOpen: boolean;
	/** The filter controls to render inline or inside the popover */
	children: ReactNode;
	/** Optional: callback to clear all filters */
	onClear?: () => void;
}

export function FilterBar({
	activeCount,
	panelOpen,
	children,
	onClear,
}: FilterBarProps) {
	// Compact when panel open (regardless of screen), OR on small screens (handled with CSS)
	const alwaysCompact = panelOpen;

	if (alwaysCompact) {
		return (
			<div className="flex items-center gap-2">
				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="relative flex items-center justify-center size-9 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
							aria-label="Abrir filtros"
						>
							<SlidersHorizontal className="size-4" />
							{activeCount > 0 && (
								<span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
									{activeCount}
								</span>
							)}
						</button>
					</PopoverTrigger>
					<PopoverContent
						align="start"
						className="w-72 p-4 flex flex-col gap-4"
					>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Filtros</span>
							{activeCount > 0 && onClear && (
								<button
									type="button"
									onClick={onClear}
									className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
								>
									<X className="size-3" />
									Limpar
								</button>
							)}
						</div>
						{children}
					</PopoverContent>
				</Popover>
				{activeCount > 0 && onClear && (
					<button
						type="button"
						onClick={onClear}
						className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						<X className="size-3" />
						Limpar filtros
					</button>
				)}
			</div>
		);
	}

	// Wide screen + panel closed → inline layout (responsive: collapses to popover on small)
	return (
		<>
			{/* Inline on medium+ screens */}
			<div className="hidden md:flex items-center gap-3 flex-wrap">
				{children}
				{activeCount > 0 && onClear && (
					<button
						type="button"
						onClick={onClear}
						className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						<X className="size-3" />
						Limpar filtros
					</button>
				)}
			</div>

			{/* Popover on small screens */}
			<div className="flex md:hidden items-center gap-2">
				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="relative flex items-center justify-center size-9 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
							aria-label="Abrir filtros"
						>
							<SlidersHorizontal className="size-4" />
							{activeCount > 0 && (
								<span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
									{activeCount}
								</span>
							)}
						</button>
					</PopoverTrigger>
					<PopoverContent
						align="start"
						className="w-72 p-4 flex flex-col gap-4"
					>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Filtros</span>
							{activeCount > 0 && onClear && (
								<button
									type="button"
									onClick={onClear}
									className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
								>
									<X className="size-3" />
									Limpar
								</button>
							)}
						</div>
						{children}
					</PopoverContent>
				</Popover>
				{activeCount > 0 && (
					<Badge variant="secondary" className="text-xs">
						{activeCount} filtro{activeCount > 1 ? "s" : ""} ativo
						{activeCount > 1 ? "s" : ""}
					</Badge>
				)}
			</div>
		</>
	);
}
