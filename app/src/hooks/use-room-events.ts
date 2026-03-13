import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { roomsQueryKeys } from "@/services/rooms";

declare const __API_BASE_URL__: string | undefined;
const API_BASE_URL =
	(typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : undefined) ??
	(typeof import.meta !== "undefined"
		? (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
		: undefined) ??
	"http://localhost:3333";

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30000;
const RECONNECT_BACKOFF_FACTOR = 2;

export function useRoomEvents() {
	const queryClient = useQueryClient();
	const esRef = useRef<EventSource | null>(null);
	const reconnectDelayRef = useRef(RECONNECT_DELAY_MS);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;

		function connect() {
			if (!mountedRef.current) return;

			const es = new EventSource(`${API_BASE_URL}/rooms/events`, {
				withCredentials: true,
			});
			esRef.current = es;

			es.addEventListener("room-status", () => {
				queryClient.invalidateQueries({ queryKey: roomsQueryKeys.all });
				reconnectDelayRef.current = RECONNECT_DELAY_MS;
			});

			es.addEventListener("open", () => {
				reconnectDelayRef.current = RECONNECT_DELAY_MS;
			});

			es.addEventListener("error", () => {
				es.close();
				esRef.current = null;

				if (!mountedRef.current) return;

				const delay = Math.min(
					reconnectDelayRef.current,
					MAX_RECONNECT_DELAY_MS,
				);
				reconnectDelayRef.current = Math.min(
					delay * RECONNECT_BACKOFF_FACTOR,
					MAX_RECONNECT_DELAY_MS,
				);

				reconnectTimerRef.current = setTimeout(connect, delay);
			});
		}

		connect();

		return () => {
			mountedRef.current = false;

			if (reconnectTimerRef.current !== null) {
				clearTimeout(reconnectTimerRef.current);
				reconnectTimerRef.current = null;
			}

			esRef.current?.close();
			esRef.current = null;
		};
	}, [queryClient]);
}
