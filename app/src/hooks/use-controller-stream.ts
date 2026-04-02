import { useEffect, useState } from "react";

declare const __API_BASE_URL__: string | undefined;
const API_BASE_URL =
	(typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : undefined) ??
	(typeof import.meta !== "undefined"
		? (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
		: undefined) ??
	"http://localhost:3333";

export type ControllerStatusEvent = {
	controllerId: string;
	roomId: string | null;
	isOnline: boolean;
	lastSeenAt: string;
	sensorProtocol: string | null;
};

export function useControllerStream() {
	const [onlineControllers, setOnlineControllers] = useState<
		Record<string, ControllerStatusEvent>
	>({});

	useEffect(() => {
		const sseUrl = `${API_BASE_URL}/iot/controllers/stream`;
		const eventSource = new EventSource(sseUrl);

		eventSource.addEventListener("message", (e) => {
			try {
				const event = JSON.parse(e.data);
				if (event.type === "controller_status" && event.data) {
					const payload = event.data as ControllerStatusEvent;
					setOnlineControllers((prev) => ({
						...prev,
						[payload.controllerId]: payload,
					}));
				}
			} catch (err) {
				console.error("Error parsing controller stream message", err);
			}
		});

		eventSource.onerror = (err) => {
			console.error("EventSource failed:", err);
			eventSource.close();
		};

		return () => {
			eventSource.close();
		};
	}, []);

	return onlineControllers;
}
