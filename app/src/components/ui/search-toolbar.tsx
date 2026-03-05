import type { ReactNode, RefObject } from "react";

// React 19 / strict TS: useRef<T> returns RefObject<T | null>
type MaybeNullRef<T> = RefObject<T | null> | RefObject<T>;

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { useIsMac, useIsMobile as useIsMobileOS } from "@/hooks/use-os";

// ── SearchToolbar ─────────────────────────────────────────────────────────────

interface SearchToolbarProps {
	/** Controlled input value */
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	inputRef?: MaybeNullRef<HTMLInputElement>;
	/** Extra actions rendered to the right of the search input (e.g. buttons) */
	actions?: ReactNode;
}

export function SearchToolbar({
	value,
	onChange,
	placeholder = "Buscar...",
	inputRef,
	actions,
}: SearchToolbarProps) {
	const isMac = useIsMac();
	const isMobileOS = useIsMobileOS();

	return (
		<div className="flex flex-wrap items-center gap-3">
			{/* Search input */}
			<div className="relative w-full max-w-sm flex-1 min-w-40">
				<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
				<Input
					ref={inputRef as RefObject<HTMLInputElement>}
					placeholder={placeholder}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="pl-9 pr-16 bg-white dark:bg-zinc-950"
				/>
				{!isMobileOS && (
					<div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
						<Kbd>{isMac ? "cmd" : "Ctrl"}</Kbd>
						<Kbd>K</Kbd>
					</div>
				)}
			</div>

			{/* Extra actions slot */}
			{actions}
		</div>
	);
}
