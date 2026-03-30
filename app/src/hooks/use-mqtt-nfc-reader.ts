import { useCallback, useEffect, useRef, useState } from "react";
import { createControllerEventSource } from "@/services/devices/pairing";

export type MqttNfcReaderStatus = "idle" | "connecting" | "waiting" | "success" | "error";

interface UseMqttNfcReaderOptions {
	controllerId: string | null;
	onUidReceived?: (uid: string) => void;
}

/**
 * Hook que abre uma conexão SSE com o backend para escutar UIDs lidos
 * pelo controlador RC522 selecionado. A conexão é mantida enquanto
 * `controllerId` for não-nulo e `active` for true.
 */
export function useMqttNfcReader({ controllerId, onUidReceived }: UseMqttNfcReaderOptions) {
	const [status, setStatus] = useState<MqttNfcReaderStatus>("idle");
	const [lastUid, setLastUid] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [active, setActive] = useState(false);

	const esRef = useRef<EventSource | null>(null);
	const onUidRef = useRef(onUidReceived);
	onUidRef.current = onUidReceived;

	const startCapture = useCallback(() => {
		setLastUid(null);
		setErrorMessage(null);
		setActive(true);
	}, []);

	const cancelCapture = useCallback(() => {
		setActive(false);
		setStatus("idle");
		setLastUid(null);
		setErrorMessage(null);
	}, []);

	useEffect(() => {
		// Fecha qualquer EventSource anterior
		if (esRef.current) {
			esRef.current.close();
			esRef.current = null;
		}

		if (!active || !controllerId) {
			setStatus("idle");
			return;
		}

		setStatus("connecting");

		const es = createControllerEventSource(controllerId);
		esRef.current = es;

		es.onopen = () => {
			setStatus("waiting");
		};

		es.onmessage = (event) => {
			if (event.data === "connected") {
				setStatus("waiting");
				return;
			}

			try {
				const payload = JSON.parse(event.data) as {
					credentialValue: string;
					credentialType: string;
					timestamp: string;
				};

				if (payload.credentialValue) {
					const uid = payload.credentialValue;
					setLastUid(uid);
					setStatus("success");
					setActive(false);
					onUidRef.current?.(uid);
				}
			} catch {
				// Mensagem de handshake ou formato inesperado, ignorar
			}
		};

		es.onerror = () => {
			setStatus("error");
			setErrorMessage("Falha na conexão com o leitor. Verifique se o dispositivo está online.");
			setActive(false);
		};

		return () => {
			es.close();
			esRef.current = null;
		};
	}, [active, controllerId]);

	return {
		status,
		lastUid,
		errorMessage,
		startCapture,
		cancelCapture,
	};
}
