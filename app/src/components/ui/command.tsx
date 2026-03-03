import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

// ── Context ───────────────────────────────────────────────────────────────────

interface CommandContextValue {
  search: string;
  setSearch: (v: string) => void;
}

const CommandContext = React.createContext<CommandContextValue>({
  search: "",
  setSearch: () => {},
});

function useCommand() {
  return React.useContext(CommandContext);
}

// ── Command Root ──────────────────────────────────────────────────────────────

interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Controlled search value */
  value?: string;
  onValueChange?: (value: string) => void;
}

function Command({
  className,
  value,
  onValueChange,
  children,
  ...props
}: CommandProps) {
  const [internalSearch, setInternalSearch] = React.useState("");

  const search = value !== undefined ? value : internalSearch;
  const setSearch = React.useCallback(
    (v: string) => {
      if (value === undefined) setInternalSearch(v);
      onValueChange?.(v);
    },
    [value, onValueChange],
  );

  return (
    <CommandContext.Provider value={{ search, setSearch }}>
      <div
        data-slot="command"
        className={cn(
          "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
}

// ── Command Input ─────────────────────────────────────────────────────────────

interface CommandInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange"
  > {
  /** Show clear button when there is text */
  showClear?: boolean;
}

function CommandInput({
  className,
  showClear = true,
  placeholder = "Buscar...",
  ...props
}: CommandInputProps) {
  const { search, setSearch } = useCommand();

  return (
    <div
      data-slot="command-input-wrapper"
      className="flex items-center border-b px-3"
    >
      <Search className="mr-2 size-4 shrink-0 opacity-50" />
      <input
        data-slot="command-input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      {showClear && search && (
        <button
          type="button"
          onClick={() => setSearch("")}
          className="ml-1 flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Command List ──────────────────────────────────────────────────────────────

function CommandList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-list"
      className={cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        className,
      )}
      {...props}
    />
  );
}

// ── Command Empty ─────────────────────────────────────────────────────────────

function CommandEmpty({
  className,
  children = "Nenhum resultado encontrado.",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-empty"
      className={cn(
        "py-6 text-center text-sm text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Command Group ─────────────────────────────────────────────────────────────

function CommandGroup({
  className,
  heading,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { heading?: string }) {
  return (
    <div
      data-slot="command-group"
      className={cn("overflow-hidden p-1 text-foreground", className)}
      {...props}
    >
      {heading && (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Command Separator ─────────────────────────────────────────────────────────

function CommandSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-separator"
      className={cn("bg-border -mx-1 h-px", className)}
      {...props}
    />
  );
}

// ── Command Item ──────────────────────────────────────────────────────────────

interface CommandItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  /** The text value used for filtering — if not set, uses children text */
  value?: string;
  disabled?: boolean;
  /** If true this item is always shown regardless of the current search */
  forceMount?: boolean;
}

function CommandItem({
  className,
  value,
  disabled,
  forceMount,
  children,
  onClick,
  onKeyDown,
  ...props
}: CommandItemProps) {
  const { search } = useCommand();

  const filterValue = value ?? (typeof children === "string" ? children : "");
  const matches =
    forceMount ||
    !search.trim() ||
    filterValue.toLowerCase().includes(search.toLowerCase().trim());

  if (!matches) return null;

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled)
        onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
    }
    onKeyDown?.(e);
  }

  return (
    <button
      type="button"
      data-slot="command-item"
      data-disabled={disabled || undefined}
      disabled={disabled}
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none text-left",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:bg-accent focus-visible:text-accent-foreground",
        className,
      )}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Command Shortcut ──────────────────────────────────────────────────────────

function CommandShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
  useCommand,
};
