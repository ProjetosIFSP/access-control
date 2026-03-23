import { useCallback, useEffect, useRef, useState } from "react";

export type NfcReaderStatus =
	| "idle"
	| "waiting"
	| "reading"
	| "success"
	| "error";

export function useNfcReader() {
	const [status, setStatus] = useState<NfcReaderStatus>("idle");
	const [lastUid, setLastUid] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const bufferRef = useRef("");
	const lastKeyTimeRef = useRef(0);
	const isCancelledRef = useRef(false);
	const statusRef = useRef<NfcReaderStatus>("idle");

	// Sincroniza o ref de status com o estado para acesso no evento de teclado
	useEffect(() => {
		statusRef.current = status;
	}, [status]);

	const startCapture = useCallback(() => {
		isCancelledRef.current = false;
		setStatus("waiting");
		setLastUid(null);
		setErrorMessage(null);
		bufferRef.current = "";
	}, []);

	const cancelCapture = useCallback(() => {
		isCancelledRef.current = true;
		setStatus("idle");
		setErrorMessage(null);
		bufferRef.current = "";
	}, []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (statusRef.current !== "waiting" && statusRef.current !== "reading") {
				return;
			}

			// Ignorar teclas modificadoras puras
			if (
				event.key === "Shift" ||
				event.key === "Control" ||
				event.key === "Alt" ||
				event.key === "Meta" ||
				event.key === "CapsLock"
			) {
				return;
			}

			const now = Date.now();
			const timeSinceLastKey = now - lastKeyTimeRef.current;

			// Leitores RFID/NFC que emulam teclado digitam muito rápido (< 50ms)
			if (bufferRef.current.length > 0 && timeSinceLastKey > 100) {
				bufferRef.current = "";
			}

			lastKeyTimeRef.current = now;

			if (event.key === "Enter") {
				event.preventDefault();
				if (bufferRef.current.length > 0) {
					// Finalizou a leitura
					const uid = bufferRef.current;
					setStatus("success");
					setLastUid(uid);
					bufferRef.current = "";
				}
				return;
			}

			if (bufferRef.current.length === 0) {
				setStatus("reading");
			}

			if (event.key.length === 1) {
				event.preventDefault();
				bufferRef.current += event.key;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return {
		status,
		lastUid,
		errorMessage,
		startCapture,
		cancelCapture,
	};
}
