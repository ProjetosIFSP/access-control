import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

// ── Root ──────────────────────────────────────────────────────────────────────

function Combobox<Value>({
	className: _className,
	...props
}: React.ComponentProps<typeof ComboboxPrimitive.Root<Value>> & {
	className?: string;
}) {
	return <ComboboxPrimitive.Root data-slot="combobox" {...props} />;
}

// ── Input + Clear ─────────────────────────────────────────────────────────────

interface ComboboxInputProps
	extends Omit<
		React.ComponentProps<typeof ComboboxPrimitive.Input>,
		"className"
	> {
	/** Show an X button to clear the current value when one is selected */
	showClear?: boolean;
	className?: string;
}

function ComboboxInput({
	showClear = false,
	className,
	placeholder,
	...props
}: ComboboxInputProps) {
	return (
		<div
			data-slot="combobox-input-wrapper"
			className="relative flex items-center"
		>
			<ComboboxPrimitive.Input
				data-slot="combobox-input"
				placeholder={placeholder}
				className={cn(
					"border-input bg-background placeholder:text-muted-foreground flex h-9 w-full rounded-full border px-3 py-2 text-sm shadow-xs outline-none",
					"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
					"disabled:cursor-not-allowed disabled:opacity-50",
					"transition-[color,box-shadow]",
					showClear ? "pr-14" : "pr-8",
					className,
				)}
				{...props}
			/>
			{showClear && (
				<ComboboxPrimitive.Clear
					data-slot="combobox-clear"
					className={cn(
						"absolute right-7 top-1/2 -translate-y-1/2",
						"flex items-center justify-center rounded-sm p-0.5",
						"text-muted-foreground hover:text-foreground hover:bg-accent",
						"transition-colors",
						"hidden [&:not([hidden])]:flex",
					)}
					aria-label="Limpar"
				>
					<XIcon className="size-3.5" />
				</ComboboxPrimitive.Clear>
			)}
			<ComboboxPrimitive.Icon
				data-slot="combobox-icon"
				className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
			>
				<ChevronDownIcon className="size-4 opacity-50" />
			</ComboboxPrimitive.Icon>
		</div>
	);
}

// ── Content (Positioner + Popup) ──────────────────────────────────────────────

function ComboboxContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof ComboboxPrimitive.Positioner>) {
	return (
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Positioner
				data-slot="combobox-positioner"
				sideOffset={6}
				className="z-50 w-(--anchor-width)"
				{...props}
			>
				<ComboboxPrimitive.Popup
					data-slot="combobox-popup"
					className={cn(
						"bg-popover text-popover-foreground",
						"min-w-32 rounded-md border shadow-md",
						"data-ending-style:animate-out data-ending-style:fade-out-0 data-ending-style:zoom-out-95",
						"data-starting-style:animate-in data-starting-style:fade-in-0 data-starting-style:zoom-in-95",
						"origin-(--transform-origin) transition-[transform,scale,opacity] duration-100",
						"overflow-hidden p-1",
						className,
					)}
				>
					{children}
				</ComboboxPrimitive.Popup>
			</ComboboxPrimitive.Positioner>
		</ComboboxPrimitive.Portal>
	);
}

// ── Empty ─────────────────────────────────────────────────────────────────────

function ComboboxEmpty({
	className,
	children,
	...props
}: React.ComponentProps<typeof ComboboxPrimitive.Empty>) {
	return (
		<ComboboxPrimitive.Empty
			data-slot="combobox-empty"
			className={cn(
				"py-6 text-center text-sm text-muted-foreground",
				className,
			)}
			{...props}
		>
			{children}
		</ComboboxPrimitive.Empty>
	);
}

// ── List ──────────────────────────────────────────────────────────────────────

function ComboboxList({
	className,
	children,
	...props
}: React.ComponentProps<typeof ComboboxPrimitive.List>) {
	return (
		<ComboboxPrimitive.List
			data-slot="combobox-list"
			className={cn("max-h-60 overflow-y-auto", className)}
			{...props}
		>
			{children}
		</ComboboxPrimitive.List>
	);
}

// ── Item ──────────────────────────────────────────────────────────────────────

function ComboboxItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof ComboboxPrimitive.Item>) {
	return (
		<ComboboxPrimitive.Item
			data-slot="combobox-item"
			className={cn(
				"relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none",
				"data-highlighted:bg-accent data-highlighted:text-accent-foreground",
				"data-disabled:pointer-events-none data-disabled:opacity-50",
				"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		>
			<ComboboxPrimitive.ItemIndicator className="absolute right-2 flex size-3.5 items-center justify-center">
				<CheckIcon className="size-4" />
			</ComboboxPrimitive.ItemIndicator>
			{children}
		</ComboboxPrimitive.Item>
	);
}

// ── Separator ─────────────────────────────────────────────────────────────────

function ComboboxSeparator({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="combobox-separator"
			className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
			{...props}
		/>
	);
}

export {
	Combobox,
	ComboboxInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxList,
	ComboboxItem,
	ComboboxSeparator,
};
