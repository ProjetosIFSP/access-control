/// <reference types="vite/client" />

import { queryOptions } from "@tanstack/react-query";

declare const __API_BASE_URL__: string | undefined;
const API_BASE_URL =
	(typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : undefined) ??
	(typeof import.meta !== "undefined"
		? (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
		: undefined) ??
	"http://localhost:3333";

export type PairingDevice = {
	id: string;
	sensorProtocol: string | null;
	sensorModel: string | null;
	firmwareVersion: string | null;
	lastSeenAt: string;
};

export const devicesQueryKeys = {
	all: ["devices"] as const,
	pairing: () => [...devicesQueryKeys.all, "pairing"] as const,
};

export async function fetchPairingDevices(): Promise<PairingDevice[]> {
	const res = await fetch(`${API_BASE_URL}/iot/devices/pairing`, {
		credentials: "include",
	});
	if (!res.ok) throw new Error("Falha ao carregar dispositivos em pareamento");
	const data = await res.json();
	return data.devices as PairingDevice[];
}

export const pairingDevicesQueryOptions = queryOptions({
	queryKey: devicesQueryKeys.pairing(),
	queryFn: fetchPairingDevices,
	// Revalida a cada 20s para manter o status "online" atualizado
	refetchInterval: 20_000,
	staleTime: 15_000,
});

/**
 * Cria um EventSource que escuta UIDs lidos pelo controlador via SSE.
 * O servidor emite `data: {"controllerId":"...","credentialValue":"A1:B2:C3:D4",...}`
 * quando o ESP8266 publica um access-attempt.
 */
export function createControllerEventSource(controllerId: string): EventSource {
	return new EventSource(
		`${API_BASE_URL}/iot/devices/${encodeURIComponent(controllerId)}/events`,
	);
}
