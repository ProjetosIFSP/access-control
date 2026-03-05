import * as React from "react";
import { cn } from "@/lib/utils";

// ── Context ───────────────────────────────────────────────────────────────────

interface SplitViewContextValue {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
}

const SplitViewContext = React.createContext<SplitViewContextValue | null>(
	null,
);

export function useSplitView() {
	const context = React.useContext(SplitViewContext);
	if (!context) {
		throw new Error("useSplitView must be used within a SplitView");
	}
	return context;
}

// ── SplitView ─────────────────────────────────────────────────────────────────

interface SplitViewProps {
	children: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	className?: string;
}

export function SplitView({
	children,
	open,
	onOpenChange,
	className,
}: SplitViewProps) {
	const [internalOpen, setInternalOpen] = React.useState(false);

	const isControlled = open !== undefined;
	const isOpen = isControlled ? open : internalOpen;

	const setIsOpen = React.useCallback(
		(newOpen: boolean) => {
			if (!isControlled) {
				setInternalOpen(newOpen);
			}
			onOpenChange?.(newOpen);
		},
		[isControlled, onOpenChange],
	);

	return (
		<SplitViewContext.Provider value={{ isOpen, setIsOpen }}>
			<div className={cn("h-full w-full overflow-hidden", className)}>
				<div
					className={cn(
						"flex h-full transition-transform duration-300 ease-in-out gap-4",
						isOpen
							? "w-[calc(200%+1rem)] md:w-full -translate-x-[calc(50%+0.5rem)] md:translate-x-0"
							: "w-[calc(200%+1rem)] md:w-full translate-x-0",
					)}
					role="split-view"
				>
					{children}
				</div>
			</div>
		</SplitViewContext.Provider>
	);
}

// ── SplitViewMain ─────────────────────────────────────────────────────────────

interface SplitViewSlotProps {
	children: React.ReactNode;
	className?: string;
}

export function SplitViewMain({ children, className }: SplitViewSlotProps) {
	const { isOpen } = useSplitView();

	return (
		<div
			className={cn(
				"h-full w-[calc(50%-0.5rem)] shrink-0 overflow-y-auto transition-all duration-300",
				isOpen ? "md:w-[calc(50%-0.5rem)]" : "md:w-full",
				className,
			)}
			role="split-view-main"
		>
			{children}
		</div>
	);
}

// ── SplitViewPanel ────────────────────────────────────────────────────────────

export function SplitViewPanel({ children, className }: SplitViewSlotProps) {
	const { isOpen } = useSplitView();

	return (
		<div
			className={cn(
				"h-full w-[calc(50%-0.5rem)] shrink-0 overflow-y-auto transition-all duration-300",
				isOpen ? "md:w-[calc(50%-0.5rem)]" : "md:w-0 md:opacity-0",
				className,
			)}
			role="split-view-panel"
		>
			{isOpen && children}
		</div>
	);
}
