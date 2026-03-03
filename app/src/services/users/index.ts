/// <reference types="vite/client" />
import { queryOptions } from "@tanstack/react-query";

import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserRelations,
  UserSummary,
  UsersResponse,
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

export const usersQueryKeys = {
  all: ["users"] as const,
  list: (filters: { q?: string }) => ["users", filters] as const,
  relations: (id: string) => ["users", id, "relations"] as const,
};

// ── API Functions ─────────────────────────────────────────────────────────────

export async function fetchCurrentUser(): Promise<{ isAdmin: boolean }> {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Falha ao obter usuário atual");
  return res.json();
}

export async function fetchUsers(filters: {
  q?: string;
}): Promise<UsersResponse> {
  const url = new URL(`${API_BASE_URL}/users`);
  if (filters.q?.trim()) url.searchParams.set("q", filters.q.trim());

  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error("Falha ao carregar os usuários");
  return res.json();
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<UserSummary> {
  const res = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Falha ao criar usuário");
  }
  return res.json();
}

export async function updateUser({
  id,
  ...payload
}: UpdateUserPayload): Promise<UserSummary> {
  const res = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Falha ao atualizar usuário");
  }
  return res.json();
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Falha ao excluir usuário");
  }
}

export async function fetchUserRelations(id: string): Promise<UserRelations> {
  const res = await fetch(`${API_BASE_URL}/users/${id}/relations`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Falha ao carregar vínculos do usuário");
  return res.json();
}

// ── Query Options ─────────────────────────────────────────────────────────────

export const usersQueryOptions = (filters: { q?: string }) =>
  queryOptions({
    queryKey: usersQueryKeys.list(filters),
    queryFn: () => fetchUsers(filters),
    staleTime: 1000 * 60 * 2,
  });

export const userRelationsQueryOptions = (id: string | null) =>
  queryOptions({
    queryKey: usersQueryKeys.relations(id ?? ""),
    queryFn: () => fetchUserRelations(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
