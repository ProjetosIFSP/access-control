import { Plus } from "lucide-react";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { SelectFilter } from "@/components/ui/select-filter";

import type { ActiveTab } from "./types";

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface RoomsToolbarProps {
  activeTab: ActiveTab;
  inputValue: string;
  onSearchChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  panelVisible: boolean;
  selectedTypeId: string;
  selectedBlockId: string;
  onTypeChange: (id: string) => void;
  onBlockChange: (id: string) => void;
  activeFiltersCount: number;
  typeOptions: Option[];
  blockOptions: Option[];
  onCreateRoom: () => void;
  onCreateBlock: () => void;
  onCreateRoomType: () => void;
}

export function RoomsToolbar({
  activeTab,
  inputValue,
  onSearchChange,
  searchInputRef,
  panelVisible,
  selectedTypeId,
  selectedBlockId,
  onTypeChange,
  onBlockChange,
  activeFiltersCount,
  typeOptions,
  blockOptions,
  onCreateRoom,
  onCreateBlock,
  onCreateRoomType,
}: RoomsToolbarProps) {
  const searchPlaceholder =
    activeTab === "rooms"
      ? "Buscar por nome..."
      : activeTab === "types"
        ? "Buscar por nome ou sigla..."
        : "Buscar por nome...";

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SearchToolbar
          value={inputValue}
          onChange={onSearchChange}
          inputRef={searchInputRef}
          placeholder={searchPlaceholder}
        />

        {activeTab === "rooms" &&
          (typeOptions.length > 0 || blockOptions.length > 0) && (
            <FilterBar
              activeCount={activeFiltersCount}
              panelOpen={panelVisible}
            >
              {typeOptions.length > 0 && (
                <SelectFilter
                  value={selectedTypeId}
                  onValueChange={onTypeChange}
                  placeholder="Tipos"
                  options={typeOptions}
                />
              )}
              {blockOptions.length > 0 && (
                <SelectFilter
                  value={selectedBlockId}
                  onValueChange={onBlockChange}
                  placeholder="Blocos"
                  options={blockOptions}
                />
              )}
            </FilterBar>
          )}
      </div>

      <div className="flex-shrink-0">
        {activeTab === "rooms" ? (
          <Button
            size={panelVisible ? "icon" : "sm"}
            variant="hover"
            onClick={onCreateRoom}
            className={!panelVisible ? "max-sm:h-9 max-sm:w-9 max-sm:px-2" : ""}
          >
            <Plus className="size-4" />
            <span className={`hidden ${!panelVisible ? "sm:inline" : ""}`}>
              Nova Sala
            </span>
          </Button>
        ) : activeTab === "blocks" ? (
          <Button
            size={panelVisible ? "icon" : "sm"}
            variant="hover"
            onClick={onCreateBlock}
            className={!panelVisible ? "max-sm:h-9 max-sm:w-9 max-sm:px-2" : ""}
          >
            <Plus className="size-4" />
            <span className={`hidden ${!panelVisible ? "sm:inline" : ""}`}>
              Novo Bloco
            </span>
          </Button>
        ) : (
          <Button
            size={panelVisible ? "icon" : "sm"}
            variant="hover"
            onClick={onCreateRoomType}
            className={!panelVisible ? "max-sm:h-9 max-sm:w-9 max-sm:px-2" : ""}
          >
            <Plus className="size-4" />
            <span className={`hidden ${!panelVisible ? "sm:inline" : ""}`}>
              Novo Tipo
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
