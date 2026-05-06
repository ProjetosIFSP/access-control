/// <reference types="vite/client" />
import { queryOptions } from "@tanstack/react-query";

import type { FingerKey } from "@/lib/biometrics";
import { usersQueryKeys } from "./index";

// ── Config ────────────────────────────────────────────────────────────────────

declare const __API_BASE_URL__: string | undefined;
const API_BASE_URL =
	(typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : undefined) ??
	(typeof import.meta !== "undefined"
		? (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
		: undefined) ??
	"http://localhost:3333";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FingerprintSummary = {
	id: string;
	finger: FingerKey;
	isActive: boolean;
	createdAt: string;
};

export type RegisterFingerprintPayload = {
	userId: string;
	finger: FingerKey;
	/** Template bruto capturado pelo leitor (hex ou string do modo keyboard) */
	template: string;
	enrolledByControllerId?: string;
};

export type DeleteFingerprintPayload = {
	userId: string;
	credentialId: string;
};

export type ToggleFingerprintPayload = {
	userId: string;
	credentialId: string;
	isActive: boolean;
};

export type RequestFingerprintEnrollmentPayload = {
	userId: string;
	controllerId: string;
	finger: FingerKey;
};

export type RequestFingerprintEnrollmentResult = {
	enrollmentId: string;
	expiresAt: string;
};

// ── Query Keys ────────────────────────────────────────────────────────────────

export const fingerprintQueryKeys = {
	list: (userId: string) =>
		[...usersQueryKeys.all, userId, "fingerprints"] as const,
};

// ── API Functions ─────────────────────────────────────────────────────────────

export async function fetchUserFingerprints(
	userId: string,
): Promise<FingerprintSummary[]> {
	const res = await fetch(`${API_BASE_URL}/users/${userId}/fingerprints`, {
		credentials: "include",
	});
	if (!res.ok) throw new Error("Falha ao carregar as digitais do usuário");
	return res.json();
}

export async function registerFingerprint(
	payload: RegisterFingerprintPayload,
): Promise<FingerprintSummary> {
	const { userId, ...body } = payload;
	const res = await fetch(`${API_BASE_URL}/users/${userId}/fingerprints`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.message ?? "Falha ao cadastrar a digital");
	}

	return res.json();
}

export async function deleteFingerprint(
	payload: DeleteFingerprintPayload,
): Promise<void> {
	const { userId, credentialId } = payload;
	const res = await fetch(
		`${API_BASE_URL}/users/${userId}/fingerprints/${credentialId}`,
		{
			method: "DELETE",
			credentials: "include",
		},
	);

	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.message ?? "Falha ao remover a digital");
	}
}

export async function toggleFingerprint(
	payload: ToggleFingerprintPayload,
): Promise<FingerprintSummary> {
	const { userId, credentialId, isActive } = payload;
	const res = await fetch(
		`${API_BASE_URL}/users/${userId}/fingerprints/${credentialId}`,
		{
			method: "PATCH",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ isActive }),
		},
	);

	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.message ?? "Falha ao alterar o status da digital");
	}

	return res.json();
}

export async function requestFingerprintEnrollment(
	payload: RequestFingerprintEnrollmentPayload,
): Promise<RequestFingerprintEnrollmentResult> {
	const { userId, ...body } = payload;
	const res = await fetch(
		`${API_BASE_URL}/users/${userId}/fingerprints/enroll-request`,
		{
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		},
	);

	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.message ?? "Falha ao iniciar o cadastro biométrico");
	}

	return res.json();
}

// ── Query Options ─────────────────────────────────────────────────────────────

export const userFingerprintsQueryOptions = (userId: string | null) =>
	queryOptions({
		queryKey: fingerprintQueryKeys.list(userId ?? ""),
		queryFn: () => fetchUserFingerprints(userId as string),
		enabled: !!userId,
		staleTime: 1000 * 60 * 2,
	});
