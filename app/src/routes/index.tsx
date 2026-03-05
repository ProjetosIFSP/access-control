import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@/components/animate-ui/components/radix/toggle-group";
import { Footer } from "@/components/footer";
import { PageTitle } from "@/components/page/title";
import { BlockSection } from "@/components/rooms/block-section";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { SelectFilter } from "@/components/ui/select-filter";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMac, useIsMobile as useIsMobileOS } from "@/hooks/use-os";
import {
	roomsSummaryQueryOptions,
	roomTypesQueryOptions,
} from "@/services/rooms";
import type { RoomState } from "@/services/rooms/types";

// ── Query Params ──────────────────────────────────────────────────────────────

const VALID_STATES = ["aberta", "fechada", "alerta"] as const;

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
	const searchInputRef = useRef<HTMLInputElement>(null);
	const isMac = useIsMac();
	const isMobileOS = useIsMobileOS();

	// Sync debounced search value → URL
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

	// Shortcut Ctrl+K → focus search input
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

	const activeFiltersCount = (type ? 1 : 0) + (state ? 1 : 0);

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

	const roomTypeOptions =
		roomTypesData?.result.map((rt) => ({
			value: rt.abbreviation,
			label: rt.name,
		})) ?? [];

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
							value={type ?? "all"}
							onValueChange={setType}
							placeholder="Tipo de sala"
							options={roomTypeOptions}
							className="max-w-40"
						/>

						{/* Door state toggle */}
						<ToggleGroup
							type="single"
							value={state ?? "all"}
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
