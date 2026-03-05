import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MultiSelectOption {
	value: string;
	label: string;
	/** Optional secondary label (e.g. email) shown in smaller text */
	sublabel?: string;
	/** Optional tooltip content shown when hovering the badge */
	tooltip?: React.ReactNode;
}

export interface ReadonlyBadge {
	label: string;
	tooltip?: React.ReactNode;
}

interface MultiSelectProps {
	options: MultiSelectOption[];
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	disabled?: boolean;
	className?: string;
	/** Maximum height of the dropdown list */
	maxHeight?: string;
	/** Show badges inline in the trigger */
	showBadges?: boolean;
	/** If true the trigger will take full width */
	fullWidth?: boolean;
	/** Readonly (inactive) badges shown inside the trigger — no remove button */
	readonlyBadges?: ReadonlyBadge[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MultiSelect({
	options,
	value,
	onChange,
	placeholder = "Selecionar...",
	searchPlaceholder = "Buscar...",
	emptyMessage = "Nenhum resultado encontrado.",
	disabled = false,
	className,
	maxHeight = "300px",
	showBadges = true,
	fullWidth = true,
	readonlyBadges = [],
}: MultiSelectProps) {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");

	const selectedSet = React.useMemo(() => new Set(value), [value]);

	const filteredOptions = React.useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return options;
		return options.filter(
			(o) =>
				o.label.toLowerCase().includes(q) ||
				(o.sublabel ?? "").toLowerCase().includes(q),
		);
	}, [options, search]);

	function toggle(optionValue: string) {
		if (selectedSet.has(optionValue)) {
			onChange(value.filter((v) => v !== optionValue));
		} else {
			onChange([...value, optionValue]);
		}
	}

	function remove(optionValue: string, e: React.MouseEvent) {
		e.stopPropagation();
		onChange(value.filter((v) => v !== optionValue));
	}

	function clearAll(e: React.MouseEvent) {
		e.stopPropagation();
		onChange([]);
	}

	const selectedOptions = React.useMemo(
		() => options.filter((o) => selectedSet.has(o.value)),
		[options, selectedSet],
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					role="combobox"
					aria-expanded={open}
					aria-haspopup="listbox"
					disabled={disabled}
					className={cn(
						"border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring",
						"flex min-h-9 w-full items-center justify-between gap-2 rounded-full border px-3 py-2 text-sm",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
						"disabled:cursor-not-allowed disabled:opacity-50",
						"bg-white dark:bg-zinc-900",
						fullWidth ? "w-full" : "w-fit",
						className,
					)}
				>
					<div className="flex flex-1 flex-wrap gap-1 overflow-hidden">
						{/* Readonly (inactive) badges — no remove button */}
						<TooltipProvider delayDuration={300}>
							{readonlyBadges.map((rb) =>
								rb.tooltip ? (
									<Tooltip key={rb.label}>
										<TooltipTrigger asChild>
											<Badge
												variant="secondary"
												className="flex items-center text-xs cursor-default select-none opacity-70"
											>
												<span className="max-w-[140px] truncate">
													{rb.label}
												</span>
											</Badge>
										</TooltipTrigger>
										<TooltipContent side="top" className="max-w-xs">
											{rb.tooltip}
										</TooltipContent>
									</Tooltip>
								) : (
									<Badge
										key={rb.label}
										variant="secondary"
										className="flex items-center text-xs cursor-default select-none opacity-70"
									>
										<span className="max-w-[140px] truncate">{rb.label}</span>
									</Badge>
								),
							)}
						</TooltipProvider>

						{showBadges && selectedOptions.length > 0 ? (
							<TooltipProvider delayDuration={300}>
								{selectedOptions.map((opt) =>
									opt.tooltip ? (
										<Tooltip key={opt.value}>
											<TooltipTrigger asChild>
												<Badge
													variant="secondary"
													className="flex items-center gap-1 pr-1 text-xs"
												>
													<span className="max-w-[120px] truncate">
														{opt.label}
													</span>
													<button
														type="button"
														onClick={(e) => remove(opt.value, e)}
														className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
														aria-label={`Remover ${opt.label}`}
													>
														<X className="size-2.5" />
													</button>
												</Badge>
											</TooltipTrigger>
											<TooltipContent side="top" className="max-w-xs">
												{opt.tooltip}
											</TooltipContent>
										</Tooltip>
									) : (
										<Badge
											key={opt.value}
											variant="secondary"
											className="flex items-center gap-1 pr-1 text-xs"
										>
											<span className="max-w-[120px] truncate">
												{opt.label}
											</span>
											<button
												type="button"
												onClick={(e) => remove(opt.value, e)}
												className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
												aria-label={`Remover ${opt.label}`}
											>
												<X className="size-2.5" />
											</button>
										</Badge>
									),
								)}
							</TooltipProvider>
						) : readonlyBadges.length === 0 ? (
							<span
								className={cn(
									"truncate",
									selectedOptions.length === 0 && "text-muted-foreground",
								)}
							>
								{selectedOptions.length === 0
									? placeholder
									: !showBadges
										? `${selectedOptions.length} selecionado${selectedOptions.length > 1 ? "s" : ""}`
										: placeholder}
							</span>
						) : null}
					</div>

					<div className="flex shrink-0 items-center gap-1">
						{value.length > 0 && (
							<button
								type="button"
								tabIndex={0}
								onClick={clearAll}
								onKeyDown={(e) =>
									e.key === "Enter" &&
									clearAll(e as unknown as React.MouseEvent)
								}
								className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
								aria-label="Limpar seleção"
							>
								<X className="size-3" />
							</button>
						)}
						<ChevronsUpDown className="size-4 shrink-0 opacity-50" />
					</div>
				</button>
			</PopoverTrigger>

			<PopoverContent
				className="p-0"
				style={{ width: "var(--radix-popover-trigger-width)" }}
				align="start"
				sideOffset={4}
			>
				<Command value={search} onValueChange={setSearch}>
					<CommandInput placeholder={searchPlaceholder} showClear />
					<CommandList style={{ maxHeight }}>
						{filteredOptions.length === 0 ? (
							<CommandEmpty>{emptyMessage}</CommandEmpty>
						) : (
							<CommandGroup>
								{filteredOptions.map((option) => {
									const isSelected = selectedSet.has(option.value);
									return (
										<CommandItem
											key={option.value}
											value={`${option.label} ${option.sublabel ?? ""}`}
											forceMount
											onClick={() => toggle(option.value)}
											className="cursor-pointer"
										>
											<div
												className={cn(
													"mr-2 flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary",
													isSelected
														? "bg-primary text-primary-foreground"
														: "opacity-50",
												)}
											>
												{isSelected && <Check className="size-3" />}
											</div>
											<div className="flex flex-col min-w-0">
												<span className="truncate">{option.label}</span>
												{option.sublabel && (
													<span className="truncate text-xs text-muted-foreground">
														{option.sublabel}
													</span>
												)}
											</div>
										</CommandItem>
									);
								})}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
