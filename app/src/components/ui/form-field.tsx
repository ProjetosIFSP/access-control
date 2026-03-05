import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ── FormField ─────────────────────────────────────────────────────────────────

interface FormFieldProps {
	/** The label text displayed above the input */
	label: string;
	/** The htmlFor / id linking label to input */
	htmlFor: string;
	/** Error message to display below the input */
	error?: string;
	/** Optional hint text displayed below the input (hidden if error is shown) */
	hint?: string;
	children: ReactNode;
	className?: string;
}

export function FormField({
	label,
	htmlFor,
	error,
	hint,
	children,
	className,
}: FormFieldProps) {
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<Label htmlFor={htmlFor}>{label}</Label>
			{children}
			{error ? (
				<span className="text-xs text-destructive">{error}</span>
			) : hint ? (
				<span className="text-xs text-muted-foreground">{hint}</span>
			) : null}
		</div>
	);
}
