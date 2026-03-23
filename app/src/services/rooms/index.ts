/// <reference types="vite/client" />
import { queryOptions } from "@tanstack/react-query";
import type {
	BlockSummary,
	BlocksResponse,
	CreateBlockPayload,
	CreateRoomPayload,
	CreateRoomTypePayload,
	RoomAccessLogsResponse,
	RoomRelations,
	RoomSummaryAdmin,
	RoomsAdminResponse,
	RoomsSummaryFilters,
	RoomsSummaryResponse,
	RoomType,
	RoomTypesResponse,
	UpdateBlockPayload,
	UpdateRoomPayload,
	UpdateRoomTypePayload,
} from "./types";

// ── Config ────────────────────────────────────────────────────────────────────

declare const __API_BASE_URL__: string | undefined;
const API_BASE_URL =
	(typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : undefined) ??
	(typeof import.meta !== "undefined"
		? (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
		: undefined) ??
	"http://localhost:3333";

// ── Query Keys ────────────────────────────────────────────────────────────────

export const roomsQueryKeys = {
	all: ["rooms"] as const,
	summary: (filters: RoomsSummaryFilters) =>
		["rooms", "summary", filters] as const,
	adminList: (filters?: RoomsAdminFilters) =>
		["rooms", "admin", filters ?? {}] as const,
	types: ["room-types"] as const,
	blocks: ["blocks"] as const,
	relations: (id: string) => ["rooms", id, "relations"] as const,
	accessLogs: (id: string) => ["rooms", id, "access-logs"] as const,
};

export interface RoomsAdminFilters {
	q?: string;
	typeIds?: string[];
	blockIds?: string[];
	page?: number;
	pageSize?: number;
}

// ── Room Summary (public) ─────────────────────────────────────────────────────

export async function fetchRoomsSummary(
	filters: RoomsSummaryFilters,
): Promise<RoomsSummaryResponse> {
	const url = new URL(`${API_BASE_URL}/rooms/summary`);
	if (filters.q?.trim()) url.searchParams.set("q", filters.q.trim());
	if (filters.type) url.searchParams.set("type", filters.type);
	if (filters.state) url.searchParams.set("state", filters.state);

	const res = await fetch(url.toString(), { credentials: "include" });
	if (!res.ok) throw new Error("Falha ao carregar o resumo das salas");
	return res.json();
}

// ── Room Types CRUD ───────────────────────────────────────────────────────────

export async function fetchRoomTypes(): Promise<RoomTypesResponse> {
	const res = await fetch(`${API_BASE_URL}/room-types`, {
		credentials: "include",
	});
	if (!res.ok) throw new Error("Falha ao carregar os tipos de sala");
	return res.json();
}

export async function createRoomType(
	payload: CreateRoomTypePayload,
): Promise<RoomType> {
	const res = await fetch(`${API_BASE_URL}/room-types`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(
			(body as { message?: string }).message ?? "Falha ao criar tipo de sala",
		);
	}
	return res.json();
}

export async function updateRoomType({
	id,
	...payload
}: UpdateRoomTypePayload): Promise<RoomType> {
	const res = await fetch(`${API_BASE_URL}/room-types/${id}`, {
		method: "PUT",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(
			(body as { message?: string }).message ??
				"Falha ao atualizar tipo de sala",
		);
	}
	return res.json();
}

export async function deleteRoomType(id: string): Promise<void> {
	const res = await fetch(`${API_BASE_URL}/room-types/${id}`, {
		method: "DELETE",
		credentials: "include",
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(
			(body as { message?: string }).message ?? "Falha ao excluir tipo de sala",
		);
	}
}

// ── Rooms Admin CRUD ──────────────────────────────────────────────────────────

export async function fetchRoomsAdmin(
	filters?: RoomsAdminFilters,
): Promise<RoomsAdminResponse> {
	const url = new URL(`${API_BASE_URL}/rooms`);
	if (filters?.q?.trim()) url.searchParams.set("q", filters.q.trim());
	if (filters?.typeIds && filters.typeIds.length > 0) {
		url.searchParams.set("typeIds", filters.typeIds.join(","));
	}
	if (filters?.blockIds && filters.blockIds.length > 0) {
		url.searchParams.set("blockIds", filters.blockIds.join(","));
	}
	if (filters?.page) url.searchParams.set("page", String(filters.page));
	if (filters?.pageSize)
		url.searchParams.set("pageSize", String(filters.pageSize));

	const res = await fetch(url.toString(), {
		credentials: "include",
	});
	if (!res.ok) throw new Error("Falha ao carregar as salas");

	const data: {
		result: Array<{
			room: {
				id: string;
				name: string;
				blockId: string;
				typeId: string;
				typeAbbreviation?: string;
				typeName?: string;
				requiresBiometry: boolean;
				requiresRFID: boolean;
				isLocked: boolean | null;
				doorState: string;
				lastStatusUpdateAt: string | null;
				createdAt: string;
			};
			block: { id: string; name: string };
		}>;
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	} = await res.json();

	return {
		result: data.result.map(({ room, block }) => ({
			id: room.id,
			name: room.name,
			blockId: room.blockId,
			blockName: block.name,
			typeId: room.typeId,
			typeAbbreviation: room.typeAbbreviation || "",
			typeName: room.typeName || "",

			requiresBiometry: room.requiresBiometry ?? false,
			requiresRFID: room.requiresRFID ?? false,
			doorState: room.doorState,
			isLocked: room.isLocked,
			lastStatusUpdateAt: room.lastStatusUpdateAt,
			createdAt: room.createdAt,
		})),
		total: data.total,
		page: data.page,
		pageSize: data.pageSize,
		totalPages: data.totalPages,
	};
}

export async function createRoom(
	payload: CreateRoomPayload,
): Promise<RoomSummaryAdmin> {
	const res = await fetch(`${API_BASE_URL}/rooms`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(
			(body as { message?: string }).message ?? "Falha ao criar sala",
		);
	}
	return res.json();
}

export async function updateRoom({
	id,
	...payload
}: UpdateRoomPayload): Promise<RoomSummaryAdmin> {
	const res = await fetch(`${API_BASE_URL}/rooms/${id}`, {
		method: "PUT",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(
			(body as { message?: string }).message ?? "Falha ao atualizar sala",
		);
	}
	return res.json();
}

export async function deleteRoom(id: string): Promise<void> {
	const res = await fetch(`${API_BASE_URL}/rooms/${id}`, {
		method: "DELETE",
		credentials: "include",
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(
			(body as { message?: string }).message ?? "Falha ao excluir sala",
		);
	}
}

// ── Blocks CRUD ───────────────────────────────────────────────────────────────

export async function fetchBlocks(): Promise<BlocksResponse> {
	const res = await fetch(`${API_BASE_URL}/blocks`, {
		credentials: "include",
	});
	if (!res.ok) throw new Error("Falha ao carregar os blocos");
	return res.json();
}

export async function createBlock(
	payload: CreateBlockPayload,
): Promise<BlockSummary> {
	const res = await fetch(`${API_BASE_URL}/blocks`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(
			(body as { message?: string }).message ?? "Falha ao criar bloco",
		);
	}
	return res.json();
}

export async function updateBlock({
	id,
	...payload
}: UpdateBlockPayload): Promise<BlockSummary> {
	const res = await fetch(`${API_BASE_URL}/blocks/${id}`, {
		method: "PUT",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(
			(body as { message?: string }).message ?? "Falha ao atualizar bloco",
		);
	}
	return res.json();
}

export async function deleteBlock(id: string): Promise<void> {
	const res = await fetch(`${API_BASE_URL}/blocks/${id}`, {
		method: "DELETE",
		credentials: "include",
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(
			(body as { message?: string }).message ?? "Falha ao excluir bloco",
		);
	}
}

export async function fetchRoomRelations(id: string): Promise<RoomRelations> {
	const res = await fetch(`${API_BASE_URL}/rooms/${id}/relations`, {
		credentials: "include",
	});
	if (!res.ok) throw new Error("Falha ao carregar vínculos da sala");
	return res.json();
}

export async function fetchRoomAccessLogs(
	id: string,
	limit = 3,
): Promise<RoomAccessLogsResponse> {
	const url = new URL(`${API_BASE_URL}/rooms/${id}/access-logs`);
	url.searchParams.set("limit", String(limit));
	const res = await fetch(url.toString(), { credentials: "include" });
	if (!res.ok) throw new Error("Falha ao carregar logs de acesso da sala");
	return res.json();
}

// ── Query Options ─────────────────────────────────────────────────────────────

export const roomsSummaryQueryOptions = (filters: RoomsSummaryFilters) =>
	queryOptions({
		queryKey: roomsQueryKeys.summary(filters),
		queryFn: () => fetchRoomsSummary(filters),
		staleTime: 1000 * 60 * 5,
	});

export const roomTypesQueryOptions = queryOptions({
	queryKey: roomsQueryKeys.types,
	queryFn: fetchRoomTypes,
	staleTime: 1000 * 60 * 5,
});

export const roomsAdminQueryOptions = (filters?: RoomsAdminFilters) =>
	queryOptions({
		queryKey: roomsQueryKeys.adminList(filters),
		queryFn: () => fetchRoomsAdmin(filters),
		staleTime: 1000 * 60 * 2,
		placeholderData: (prev) => prev,
	});

export const blocksQueryOptions = queryOptions({
	queryKey: roomsQueryKeys.blocks,
	queryFn: fetchBlocks,
	staleTime: 1000 * 60 * 5,
});

export const roomRelationsQueryOptions = (id: string | null) =>
	queryOptions({
		queryKey: roomsQueryKeys.relations(id ?? ""),
		queryFn: () => fetchRoomRelations(id as string),
		enabled: !!id,
		staleTime: 1000 * 60 * 2,
	});

export const roomAccessLogsQueryOptions = (id: string | null, limit = 3) =>
	queryOptions({
		queryKey: [...roomsQueryKeys.accessLogs(id ?? ""), limit],
		queryFn: () => fetchRoomAccessLogs(id as string, limit),
		enabled: !!id,
		staleTime: 1000 * 30,
	});
