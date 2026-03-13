import { Plus } from "lucide-react";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { SelectFilter } from "@/components/ui/select-filter";

import type { ActiveTab } from "./-types";

interface ProfileOption {
	value: string;
	label: string;
}

interface UsersToolbarProps {
	activeTab: ActiveTab;
	inputValue: string;
	onSearchChange: (value: string) => void;
	searchInputRef: RefObject<HTMLInputElement | null>;
	profileOptions: ProfileOption[];
	selectedProfileId: string;
	onProfileChange: (id: string) => void;
	activeFiltersCount: number;
	panelVisible: boolean;
	onCreateUser: () => void;
	onCreateProfile: () => void;
}

export function UsersToolbar({
	activeTab,
	inputValue,
	onSearchChange,
	searchInputRef,
	profileOptions,
	selectedProfileId,
	onProfileChange,
	activeFiltersCount,
	panelVisible,
	onCreateUser,
	onCreateProfile,
}: UsersToolbarProps) {
	return (
		<div className="flex items-center justify-between gap-3 w-full">
			<div className="flex items-center gap-3 flex-1 min-w-0">
				<SearchToolbar
					value={inputValue}
					onChange={onSearchChange}
					inputRef={searchInputRef}
					placeholder={
						activeTab === "users"
							? "Buscar por nome ou e-mail..."
							: "Buscar por nome ou descricao..."
					}
				/>
				{activeTab === "users" && profileOptions.length > 0 && (
					<FilterBar activeCount={activeFiltersCount} panelOpen={panelVisible}>
						<SelectFilter
							value={selectedProfileId}
							onValueChange={onProfileChange}
							placeholder="Perfil de acesso"
							options={profileOptions}
						/>
					</FilterBar>
				)}
			</div>

			<div className="flex-shrink-0">
				{activeTab === "users" ? (
					<Button
						size={panelVisible ? "icon" : "sm"}
						variant="hover"
						onClick={onCreateUser}
						className={!panelVisible ? "max-sm:px-2 max-sm:w-9 max-sm:h-9" : ""}
					>
						<Plus className="size-4" />
						<span className={`hidden ${!panelVisible ? "sm:inline" : ""}`}>
							Novo Usuario
						</span>
					</Button>
				) : (
					<Button
						size={panelVisible ? "icon" : "sm"}
						variant="hover"
						onClick={onCreateProfile}
						className={!panelVisible ? "max-sm:px-2 max-sm:w-9 max-sm:h-9" : ""}
					>
						<Plus className="size-4" />
						<span className={`hidden ${!panelVisible ? "sm:inline" : ""}`}>
							Novo Perfil
						</span>
					</Button>
				)}
			</div>
		</div>
	);
}
