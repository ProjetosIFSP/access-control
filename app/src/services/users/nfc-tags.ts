/// <reference types="vite/client" />
import { queryOptions } from "@tanstack/react-query";

import { usersQueryKeys } from "./index";

declare const __API_BASE_URL__: string | undefined;
const API_BASE_URL =
	(typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : undefined) ??
	(typeof import.meta !== "undefined"
		? (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
		: undefined) ??
	"http://localhost:3333";

export type NfcTagSummary = {
	id: string;
	value: string;
	isActive: boolean;
	createdAt: string;
};

export type RegisterNfcTagPayload = {
	userId: string;
	value: string;
	enrolledByControllerId?: string;
};

export type DeleteNfcTagPayload = {
	userId: string;
	credentialId: string;
};

export type ToggleNfcTagPayload = {
	userId: string;
	credentialId: string;
	isActive: boolean;
};

export const nfcTagQueryKeys = {
	list: (userId: string) => [...usersQueryKeys.all, userId, "nfcTags"] as const,
};

export async function fetchUserNfcTags(
	userId: string,
): Promise<NfcTagSummary[]> {
	const res = await fetch(`${API_BASE_URL}/users/${userId}/nfc-tags`, {
		credentials: "include",
	});
	if (!res.ok) throw new Error("Falha ao carregar os cartões NFC do usuário");
	return res.json();
}

export async function registerNfcTag(
	payload: RegisterNfcTagPayload,
): Promise<NfcTagSummary> {
	const { userId, ...body } = payload;
	const res = await fetch(`${API_BASE_URL}/users/${userId}/nfc-tags`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		if (res.status === 409) {
			throw new Error("Este cartão já está cadastrado.");
		}
		const data = await res.json().catch(() => ({}));
		throw new Error(data.message ?? "Falha ao cadastrar o cartão NFC");
	}

	return res.json();
}

export async function deleteNfcTag(
	payload: DeleteNfcTagPayload,
): Promise<void> {
	const { userId, credentialId } = payload;
	const res = await fetch(
		`${API_BASE_URL}/users/${userId}/nfc-tags/${credentialId}`,
		{
			method: "DELETE",
			credentials: "include",
		},
	);

	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.message ?? "Falha ao remover o cartão NFC");
	}
}

export async function toggleNfcTag(
	payload: ToggleNfcTagPayload,
): Promise<NfcTagSummary> {
	const { userId, credentialId, isActive } = payload;
	const res = await fetch(
		`${API_BASE_URL}/users/${userId}/nfc-tags/${credentialId}`,
		{
			method: "PATCH",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ isActive }),
		},
	);

	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.message ?? "Falha ao alterar o status do cartão NFC");
	}

	return res.json();
}

export const userNfcTagsQueryOptions = (userId: string | null) =>
	queryOptions({
		queryKey: nfcTagQueryKeys.list(userId ?? ""),
		queryFn: () => fetchUserNfcTags(userId as string),
		enabled: !!userId,
		staleTime: 1000 * 60 * 2,
	});
