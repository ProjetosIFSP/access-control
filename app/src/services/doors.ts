/// <reference types="vite/client" />
import { queryOptions } from "@tanstack/react-query";

declare const __API_BASE_URL__: string | undefined;
const API_BASE_URL =
	(typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : undefined) ??
	(typeof import.meta !== "undefined"
		? (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
		: undefined) ??
	"http://localhost:3333";

export type ControllerTarget = {
	controllerId: string;
	firmwareVersion: string | null;
	lastSeenAt: string;
	sensorModel: string | null;
	sensorProtocol: string | null;
};

export type RoomControllerTarget = ControllerTarget & {
	roomId: string;
	roomName: string;
};

export type ControllerTargetsResponse = {
	pairingControllers: ControllerTarget[];
	roomControllers: RoomControllerTarget[];
};

export const doorsQueryKeys = {
	credentialTargets: ["doors", "credential-targets"] as const,
};

export async function fetchControllerTargets(): Promise<ControllerTargetsResponse> {
	const res = await fetch(`${API_BASE_URL}/doors/credential-targets`, {
		credentials: "include",
	});

	if (!res.ok) {
		throw new Error("Falha ao carregar controladores disponiveis");
	}

	return res.json();
}

export const controllerTargetsQueryOptions = queryOptions({
	queryKey: doorsQueryKeys.credentialTargets,
	queryFn: fetchControllerTargets,
	staleTime: 1000 * 15,
});
