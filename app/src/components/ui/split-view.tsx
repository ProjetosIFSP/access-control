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
						"flex h-full transition-transform duration-300 ease-in-out",
						isOpen
							? "w-[200dvw] md:w-full -translate-x-[100dvw] md:translate-x-0"
							: "w-[200dvw] md:w-full translate-x-0",
					)}
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
				"h-full w-dvw shrink-0 overflow-y-auto transition-all duration-300",
				isOpen ? "md:w-1/2" : "md:w-full",
				className,
			)}
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
				"h-full w-dvw shrink-0 overflow-y-auto transition-all duration-300",
				isOpen ? "md:w-1/2" : "md:w-0 md:opacity-0",
				className,
			)}
		>
			{isOpen && children}
		</div>
	);
}
