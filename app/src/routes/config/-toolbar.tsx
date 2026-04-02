import { Plus, Search } from "lucide-react";
import { FillableButton } from "#/components/ui/fillable-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ConfigActiveTab } from "./-types";

interface ConfigToolbarProps {
	activeTab: ConfigActiveTab;
	searchValue: string;
	onSearchChange: (value: string) => void;
	onAddController: () => void;
}

export function ConfigToolbar({
	activeTab,
	searchValue,
	onSearchChange,
	onAddController,
}: ConfigToolbarProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-1 flex-wrap items-center gap-2">
					<div className="relative w-full max-w-sm">
						<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
						<Input
							placeholder={
								activeTab === "controllers"
									? "Buscar controlador..."
									: "Buscar..."
							}
							className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-1 focus-visible:ring-zinc-950"
							value={searchValue}
							onChange={(e) => onSearchChange(e.target.value)}
						/>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{activeTab === "controllers" && (
						<FillableButton inverse onClick={onAddController}>
							<Plus className="mr-2 h-4 w-4" />
							Configurar Controlador
						</FillableButton>
					)}
				</div>
			</div>
		</div>
	);
}
