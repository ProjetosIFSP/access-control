import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover";

interface FilterBarProps {
  /** Number of currently active filter values */
  activeCount: number;
  /** Whether the split-view panel is visible — triggers compact mode */
  panelOpen: boolean;
  /** The filter controls to render inline or inside the popover */
  children: ReactNode;
}

export function FilterBar({
  activeCount,
  panelOpen,
  children,
}: FilterBarProps) {
  const compact = panelOpen;

  const iconButton = (
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
  );

  const popover = (
    <Popover>
      <PopoverTrigger asChild>{iconButton}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-4 flex flex-col gap-3">
        <span className="text-sm font-medium">Filtros</span>
        {children}
      </PopoverContent>
    </Popover>
  );

  if (compact) {
    return popover;
  }

  return (
    <>
      {/* Inline on medium+ screens */}
      <div className="hidden md:flex items-center gap-3">{children}</div>

      {/* Popover on small screens */}
      <div className="flex md:hidden">{popover}</div>
    </>
  );
}
