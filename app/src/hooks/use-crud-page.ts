import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";

// ── useCrudPage ───────────────────────────────────────────────────────────────
//
// Encapsulates the repeated pattern found in every CRUD page:
//   - Search input state + debounce
//   - Split-panel open/close (create vs edit)
//   - Delete target state
//   - Ctrl+K focus + Escape close keyboard shortcuts
//
// Usage:
//   const crud = useCrudPage<UserSummary>({ searchInputRef });

interface UseCrudPageOptions {
  /** Ref to the search input element for Ctrl+K focus shortcut */
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  /** Initial search value (e.g. from URL search params) */
  initialSearch?: string;
  /** Debounce delay in ms (default: 400) */
  debounceMs?: number;
}

interface UseCrudPageReturn<T> {
  // Search
  inputValue: string;
  setInputValue: (value: string) => void;
  /** Debounced value -- use this to drive URL params / queries */
  debouncedSearch: string;

  // Panel (create / edit)
  formOpen: boolean;
  editItem: T | null;
  panelVisible: boolean;
  openCreate: () => void;
  openEdit: (item: T) => void;
  closePanel: () => void;

  // Delete
  deleteTarget: T | null;
  setDeleteTarget: (item: T | null) => void;
}

export function useCrudPage<T>({
  searchInputRef,
  initialSearch = "",
  debounceMs = 400,
}: UseCrudPageOptions): UseCrudPageReturn<T> {
  const [inputValue, setInputValue] = useState(initialSearch);
  const debouncedSearch = useDebounce(inputValue, debounceMs);

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const panelVisible = formOpen || editItem !== null;

  const openCreate = useCallback(() => {
    setEditItem(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setFormOpen(false);
    setEditItem(item);
  }, []);

  const closePanel = useCallback(() => {
    setEditItem(null);
    setFormOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && panelVisible) {
        closePanel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [panelVisible, closePanel, searchInputRef]);

  return {
    inputValue,
    setInputValue,
    debouncedSearch,
    formOpen,
    editItem,
    panelVisible,
    openCreate,
    openEdit,
    closePanel,
    deleteTarget,
    setDeleteTarget,
  };
}
