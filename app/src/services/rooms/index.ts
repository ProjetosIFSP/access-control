/// <reference types="vite/client" />
import { queryOptions } from "@tanstack/react-query";

import type {
  BlockSummary,
  BlocksResponse,
  CreateBlockPayload,
  CreateRoomPayload,
  RoomsAdminResponse,
  RoomRelations,
  RoomsSummaryFilters,
  RoomsSummaryResponse,
  RoomSummaryAdmin,
  RoomTypesResponse,
  UpdateBlockPayload,
  UpdateRoomPayload,
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
  adminList: ["rooms", "admin"] as const,
  types: ["room-types"] as const,
  blocks: ["blocks"] as const,
  relations: (id: string) => ["rooms", id, "relations"] as const,
};

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

// ── Room Types ────────────────────────────────────────────────────────────────

export async function fetchRoomTypes(): Promise<RoomTypesResponse> {
  const res = await fetch(`${API_BASE_URL}/room-types`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Falha ao carregar os tipos de sala");
  return res.json();
}

// ── Rooms Admin CRUD ──────────────────────────────────────────────────────────

export async function fetchRoomsAdmin(): Promise<RoomsAdminResponse> {
  const res = await fetch(`${API_BASE_URL}/rooms`, {
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
        requiresBiometry: boolean;
        requiresRFID: boolean;
        isLocked: boolean | null;
        doorState: string;
        lastStatusUpdateAt: string | null;
        createdAt: string;
      };
      block: { id: string; name: string };
    }>;
  } = await res.json();

  return {
    result: data.result.map(({ room, block }) => ({
      id: room.id,
      name: room.name,
      blockId: room.blockId,
      blockName: block.name,
      typeId: room.typeId,
      typeAbbreviation: "",
      typeName: "",
      requiresBiometry: room.requiresBiometry ?? false,
      requiresRFID: room.requiresRFID ?? false,
      doorState: room.doorState,
      isLocked: room.isLocked,
      lastStatusUpdateAt: room.lastStatusUpdateAt,
      createdAt: room.createdAt,
    })),
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

export const roomsAdminQueryOptions = queryOptions({
  queryKey: roomsQueryKeys.adminList,
  queryFn: fetchRoomsAdmin,
  staleTime: 1000 * 60 * 2,
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
