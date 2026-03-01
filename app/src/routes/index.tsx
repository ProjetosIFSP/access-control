import { useEffect, useRef, useState } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/animate-ui/components/radix/toggle-group";
import { useDebounce } from "@/hooks/use-debounce";
import { PageTitle } from "@/components/page/title";
import { BlockSection } from "@/components/rooms/block-section";

// ── Config ────────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

// ── Types ─────────────────────────────────────────────────────────────────────

type UserInfo = { id: string; name: string; email: string };
type RoomState = "aberta" | "fechada" | "alerta";

type RoomSummaryItem = {
  id: string;
  name: string;
  typeAbbreviation: string;
  state: RoomState;
  lastStatusUpdateAt: string | null;
  currentUser?: UserInfo | null;
  lastUser?: UserInfo | null;
};

type BlockWithRooms = {
  block: { id: string; name: string };
  rooms: RoomSummaryItem[];
};

type RoomsSummaryResponse = {
  authenticated: boolean;
  isAdmin: boolean;
  result: BlockWithRooms[];
};

type RoomType = { id: string; name: string; abbreviation: string };
type RoomTypesResponse = { result: RoomType[] };

// ── Query Params ──────────────────────────────────────────────────────────────

const VALID_STATES = ["aberta", "fechada", "alerta"] as const;

// ── API ───────────────────────────────────────────────────────────────────────

const roomsSummaryQueryOptions = (filters: {
  q?: string;
  type?: string;
  state?: RoomState;
}) =>
  queryOptions({
    queryKey: ["rooms-summary", filters],
    queryFn: async () => {
      const url = new URL(`${API_BASE_URL}/rooms/summary`);
      if (filters.q?.trim()) url.searchParams.set("q", filters.q.trim());
      if (filters.type) url.searchParams.set("type", filters.type);
      if (filters.state) url.searchParams.set("state", filters.state);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar o resumo das salas");
      return res.json() as Promise<RoomsSummaryResponse>;
    },
    staleTime: 1000 * 60 * 5,
  });

const roomTypesQueryOptions = queryOptions({
  queryKey: ["room-types"],
  queryFn: async () => {
    const res = await fetch(`${API_BASE_URL}/room-types`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Falha ao carregar os tipos de sala");
    return res.json() as Promise<RoomTypesResponse>;
  },
  staleTime: 1000 * 60 * 5,
});

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
    type: typeof search.type === "string" ? search.type : undefined,
    state: VALID_STATES.includes(search.state as RoomState)
      ? (search.state as RoomState)
      : undefined,
  }),
  loaderDeps: ({ search: { q, type, state } }) => ({ q, type, state }),
  loader: ({ context, deps: { q, type, state } }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        roomsSummaryQueryOptions({ q, type, state }),
      ),
      context.queryClient.ensureQueryData(roomTypesQueryOptions),
    ]),
  component: RoomsPage,
});

// ── Component ─────────────────────────────────────────────────────────────────

function RoomsPage() {
  const { q, type, state } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [inputValue, setInputValue] = useState(q ?? "");
  const debouncedQ = useDebounce(inputValue, 400);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    navigate({
      search: (prev) => ({ ...prev, q: debouncedQ.trim() || undefined }),
      replace: true,
    });
  }, [debouncedQ, navigate]);

  const { data, isLoading, isError, error } = useQuery(
    roomsSummaryQueryOptions({ q, type, state }),
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

  const hasFilters = !!q?.trim() || !!type || !!state;

  function setType(value: string) {
    navigate({
      search: (prev) => ({
        ...prev,
        type: value === "all" || !value ? undefined : value,
      }),
      replace: true,
    });
  }

  function setState(value: string) {
    navigate({
      search: (prev) => ({
        ...prev,
        state: value === "all" || !value ? undefined : (value as RoomState),
      }),
      replace: true,
    });
  }

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
              placeholder={searchPlaceholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>

          {/* Room type select */}
          <Select value={type ?? "all"} onValueChange={setType}>
            <SelectTrigger size="default" className="w-auto min-w-36 bg-white">
              <SelectValue placeholder="Tipo de sala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {roomTypesData?.result.map((rt) => (
                <SelectItem key={rt.id} value={rt.abbreviation}>
                  {rt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Door state toggle */}
          <ToggleGroup
            type="single"
            value={state ?? "all"}
            onValueChange={(v) => setState(v || "all")}
            variant="outline"
            className="bg-white dark:bg-zinc-950"
          >
            <ToggleGroupItem value="all">Todas</ToggleGroupItem>
            <ToggleGroupItem value="aberta">Livres</ToggleGroupItem>
            <ToggleGroupItem value="fechada">Em uso</ToggleGroupItem>
            <ToggleGroupItem value="alerta">Alerta</ToggleGroupItem>
          </ToggleGroup>
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
    <div className="flex flex-col gap-10">
      {Array.from({ length: 3 }).map((_, blockIdx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
        <div key={blockIdx} className="flex flex-col gap-3">
          {/* Block title skeleton */}
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
          {/* Cards row skeleton */}
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, cardIdx) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                key={cardIdx}
                className="flex min-w-44 shrink-0 items-stretch gap-3 rounded-xl border border-zinc-200 bg-white/60 p-3 shadow-sm"
              >
                <div className="w-1 animate-pulse rounded-full bg-zinc-200 self-stretch" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-zinc-200" />
                  <div className="h-4 w-14 animate-pulse rounded-full bg-zinc-100" />
                  <div className="mt-auto h-3 w-20 animate-pulse rounded bg-zinc-100" />
                  <div className="h-2.5 w-16 animate-pulse rounded bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
