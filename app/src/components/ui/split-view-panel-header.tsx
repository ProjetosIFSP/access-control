import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── SplitViewPanelHeader ──────────────────────────────────────────────────────

interface SplitViewPanelHeaderProps {
	title: string;
	subtitle?: string;
	onClose: () => void;
}

export function SplitViewPanelHeader({
	title,
	subtitle,
	onClose,
}: SplitViewPanelHeaderProps) {
	return (
		<div className="flex items-center justify-between border-b py-4 shrink-0">
			<div>
				<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
					{title}
				</h2>
				{subtitle && (
					<p className="text-xs text-muted-foreground">{subtitle}</p>
				)}
			</div>
			<Button variant="ghost" size="icon-xs" onClick={onClose}>
				<X className="size-4" />
				<span className="sr-only">Fechar</span>
			</Button>
		</div>
	);
}
