import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseAsString, useQueryStates } from "nuqs";
import { useDebounce } from "@/hooks/use-debounce";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/animate-ui/components/radix/toggle-group";
import { PageTitle } from "@/components/page/title";
import { BlockSection } from "@/components/rooms/block-section";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { SelectFilter } from "@/components/ui/select-filter";
import { useIsMac, useIsMobile as useIsMobileOS } from "@/hooks/use-os";
import {
  roomsSummaryQueryOptions,
  roomTypesQueryOptions,
} from "@/services/rooms";
import type { RoomState } from "@/services/rooms/types";
import { Footer } from "@/components/footer";

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_STATES = ["aberta", "fechada", "alerta"] as const;

// ── Parsers ───────────────────────────────────────────────────────────────────

const indexSearchParams = {
  q: parseAsString.withDefault(""),
  type: parseAsString.withDefault(""),
  state: parseAsString.withDefault(""),
};

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(roomsSummaryQueryOptions({})),
      context.queryClient.ensureQueryData(roomTypesQueryOptions),
    ]),
  component: RoomsPage,
});

// ── Component ─────────────────────────────────────────────────────────────────

function RoomsPage() {
  // URL state managed by nuqs — q reflects the committed (debounced) search.
  const [params, setParams] = useQueryStates(indexSearchParams, {
    history: "replace",
    shallow: false,
    clearOnDefault: true,
  });

  const { q, type, state } = params;

  // inputValue drives the text field instantly; debouncedInput is used both
  // to fire the query and to sync the URL — params.q is never read by the query.
  const [inputValue, setInputValue] = useState(q);
  const debouncedInput = useDebounce(inputValue, 500);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMac = useIsMac();
  const isMobileOS = useIsMobileOS();

  // Commit debounced value to URL once typing stops.
  useEffect(() => {
    setParams({ q: debouncedInput.trim() || "" });
  }, [debouncedInput, setParams]);

  // Keep inputValue in sync when q changes externally (e.g. browser back/fwd)
  useEffect(() => {
    setInputValue(q);
  }, [q]);

  const setType = useCallback(
    (value: string) => {
      setParams({ type: value === "all" || !value ? null : value });
    },
    [setParams],
  );

  const setState = useCallback(
    (value: string) => {
      setParams({
        state:
          value === "all" || !value
            ? null
            : (value as (typeof VALID_STATES)[number]),
      });
    },
    [setParams],
  );

  // Keyboard shortcut Ctrl/Cmd+K → focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data, isLoading, isError, error } = useQuery(
    roomsSummaryQueryOptions({
      q: debouncedInput.trim() || undefined,
      type: type || undefined,
      state: (state as RoomState) || undefined,
    }),
  );
  const { data: roomTypesData } = useQuery(roomTypesQueryOptions);

  const isAdmin = data?.isAdmin ?? false;
  const authenticated = data?.authenticated ?? false;

  const searchPlaceholder =
    authenticated && isAdmin
      ? "Buscar por sala, bloco ou usuário…"
      : "Buscar por sala ou bloco…";

  const totalRooms =
    data?.result.reduce((acc, b) => acc + b.rooms.length, 0) ?? 0;

  const hasFilters = !!debouncedInput.trim() || !!type || !!state;
  const activeFiltersCount = (type ? 1 : 0) + (state ? 1 : 0);

  const roomTypeOptions = useMemo(
    () =>
      roomTypesData?.result.map((rt) => ({
        value: rt.abbreviation,
        label: rt.name,
      })) ?? [],
    [roomTypesData],
  );

  return (
    <>
      <main className="flex w-full flex-col gap-6 pt-8">
        <PageTitle
          title="Monitoramento de Salas"
          subtitle="Visualize em tempo real o estado das salas e blocos cadastrados."
        />

        {/* Filters toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-4 sm:px-8 md:px-16 lg:px-32 transition-all">
          {/* Search */}
          <div className="relative w-full max-w-sm flex-1 min-w-40">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              ref={searchInputRef}
              placeholder={searchPlaceholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-9 pr-16 bg-white"
            />
            {!isMobileOS && (
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
                <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                <Kbd>K</Kbd>
              </div>
            )}
          </div>

          {/* Type + state filters — inline on md+, icon button popover on mobile */}
          <FilterBar activeCount={activeFiltersCount} panelOpen={false}>
            {/* Room type combobox */}
            <SelectFilter
              value={type || "all"}
              onValueChange={setType}
              placeholder="Tipo de sala"
              options={roomTypeOptions}
              className="max-w-40"
            />

            {/* Door state toggle */}
            <ToggleGroup
              type="single"
              value={state || "all"}
              onValueChange={(v) => setState(v || "all")}
              variant="outline"
              className="bg-white dark:bg-zinc-950 flex-wrap"
            >
              <ToggleGroupItem value="all">Todas</ToggleGroupItem>
              <ToggleGroupItem value="aberta">Livres</ToggleGroupItem>
              <ToggleGroupItem value="fechada">Em uso</ToggleGroupItem>
              <ToggleGroupItem value="alerta">Alerta</ToggleGroupItem>
            </ToggleGroup>
          </FilterBar>
        </div>

        {/* Content */}
        {isLoading ? (
          <CardsSkeleton />
        ) : isError ? (
          <div className="py-16 text-center text-sm text-red-500">
            {error instanceof Error
              ? error.message
              : "Erro ao carregar as salas. Tente novamente."}
          </div>
        ) : totalRooms === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Search className="size-8 text-zinc-200" />
            <p className="text-sm text-zinc-500">
              {hasFilters
                ? "Nenhuma sala encontrada com os filtros aplicados."
                : "Nenhuma sala cadastrada até o momento."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-8">
            {data?.result.map(({ block, rooms }) =>
              rooms.length === 0 ? null : (
                <BlockSection
                  key={block.id}
                  blockName={block.name}
                  rooms={rooms}
                  authenticated={authenticated}
                  isAdmin={isAdmin}
                />
              ),
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-10 px-4 sm:px-8 md:px-16 lg:px-32 transition-all">
      {Array.from({ length: 3 }).map((_, blockIdx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
        <div key={blockIdx} className="flex flex-col gap-3">
          {/* Block title skeleton */}
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
          {/* Cards grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, cardIdx) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                key={cardIdx}
                className="flex w-full items-stretch gap-2 rounded-lg bg-white p-3"
              >
                <div className="w-1 animate-pulse rounded-full bg-zinc-200 self-stretch" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-3.5 w-full animate-pulse rounded bg-zinc-200" />
                  <div className="h-4 w-10 animate-pulse rounded-full bg-zinc-100" />
                  <div className="mt-auto h-3 w-3/4 animate-pulse rounded bg-zinc-100" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
