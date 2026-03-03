/// <reference types="vite/client" />
import { queryOptions } from "@tanstack/react-query";

import type {
  CreateProfilePayload,
  ProfileRelations,
  ProfileSummary,
  ProfilesResponse,
  UpdateProfilePayload,
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

export const profilesQueryKeys = {
  all: ["profiles"] as const,
  list: ["profiles", "list"] as const,
  relations: (id: string) => ["profiles", id, "relations"] as const,
};

// ── API Functions ─────────────────────────────────────────────────────────────

export async function fetchProfiles(): Promise<ProfilesResponse> {
  const res = await fetch(`${API_BASE_URL}/profiles`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Falha ao carregar os perfis");
  return res.json();
}

export async function createProfile(
  payload: CreateProfilePayload,
): Promise<ProfileSummary> {
  const res = await fetch(`${API_BASE_URL}/profiles`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? "Falha ao criar perfil",
    );
  }
  return res.json();
}

export async function updateProfile({
  id,
  ...payload
}: UpdateProfilePayload): Promise<ProfileSummary> {
  const res = await fetch(`${API_BASE_URL}/profiles/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? "Falha ao atualizar perfil",
    );
  }
  return res.json();
}

export async function deleteProfile(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/profiles/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? "Falha ao excluir perfil",
    );
  }
}

export async function fetchProfileRelations(
  id: string,
): Promise<ProfileRelations> {
  const res = await fetch(`${API_BASE_URL}/profiles/${id}/relations`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Falha ao carregar vínculos do perfil");
  return res.json();
}

// ── Query Options ─────────────────────────────────────────────────────────────

export const profilesQueryOptions = queryOptions({
  queryKey: profilesQueryKeys.list,
  queryFn: fetchProfiles,
  staleTime: 1000 * 60 * 2,
});

export const profileRelationsQueryOptions = (id: string | null) =>
  queryOptions({
    queryKey: profilesQueryKeys.relations(id ?? ""),
    queryFn: () => fetchProfileRelations(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
