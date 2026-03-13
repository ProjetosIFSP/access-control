import { useCallback, useEffect, useRef, useState } from "react";
import type { FingerprintStatus } from "@/lib/biometrics";

// ── Web HID type declarations ─────────────────────────────────────────────────
// The Web HID API is not yet in the standard TypeScript DOM lib.
// We declare only what we need here to avoid installing a separate @types package.

interface HIDDeviceFilter {
	vendorId?: number;
	productId?: number;
	usagePage?: number;
	usage?: number;
}

interface HIDInputReportEvent extends Event {
	readonly device: HIDDevice;
	readonly reportId: number;
	readonly data: DataView;
}

interface HIDConnectionEvent extends Event {
	readonly device: HIDDevice;
}

interface HIDDevice extends EventTarget {
	readonly opened: boolean;
	readonly vendorId: number;
	readonly productId: number;
	readonly productName: string;
	open(): Promise<void>;
	close(): Promise<void>;
}

interface HID {
	requestDevice(options: { filters: HIDDeviceFilter[] }): Promise<HIDDevice[]>;
	addEventListener(
		type: "connect" | "disconnect",
		listener: (event: HIDConnectionEvent) => void,
	): void;
	removeEventListener(
		type: "connect" | "disconnect",
		listener: (event: HIDConnectionEvent) => void,
	): void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Timeout em ms para aguardar uma leitura antes de emitir erro.
 * O usuário tem 30 segundos para passar o dedo no leitor.
 */
const CAPTURE_TIMEOUT_MS = 30_000;

/**
 * Filtros HID conhecidos para leitores de digital comuns.
 * O WA26 Boland opera em modo "keyboard emulation" por padrão (envia o
 * template como sequência de teclas), mas caso esteja em modo HID raw
 * estes filtros serão usados para seleção automática.
 *
 * Atualize após identificar o vendorId real do WA26 via TASK 13.
 */
const KNOWN_FINGERPRINT_FILTERS: HIDDeviceFilter[] = [
	// Placeholder — preencher com o vendorId/productId real do WA26 após TASK 13
	{ usagePage: 0x0001 }, // Generic Desktop Controls — abrange a maioria dos HID
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReaderMode = "hid" | "keyboard";

export interface UseFingerprintReaderOptions {
	/**
	 * Modo de operação do leitor.
	 * - "hid": usa Web HID API para leitura de dados brutos
	 * - "keyboard": aguarda o leitor emitir o template como sequência de teclado
	 *   num input oculto (modo "keyboard emulation" — padrão do WA26)
	 */
	mode?: ReaderMode;
	/** Timeout em ms para captura. Padrão: 30000 */
	captureTimeoutMs?: number;
}

export interface UseFingerprintReaderReturn {
	/** Web HID está disponível neste navegador */
	isSupported: boolean;
	/** Dispositivo HID pareado e canal aberto (modo hid) */
	isConnected: boolean;
	/** Estado atual do processo de captura */
	status: FingerprintStatus;
	/**
	 * Template bruto capturado pelo leitor.
	 * Em modo "keyboard", é a string digitada pelo leitor.
	 * Em modo "hid", é a representação hex dos bytes do relatório HID.
	 */
	lastTemplate: string | null;
	/** Mensagem de erro legível para o usuário */
	errorMessage: string | null;
	/** Tempo restante em segundos durante a captura (conta regressiva) */
	countdown: number;
	/**
	 * (modo hid) Solicita acesso ao dispositivo via seletor nativo do navegador
	 * e abre o canal HID.
	 */
	connect: () => Promise<void>;
	/**
	 * Inicia uma captura.
	 * - modo hid: aguarda inputreport do dispositivo aberto
	 * - modo keyboard: foca input oculto e aguarda input do leitor
	 */
	startCapture: () => Promise<void>;
	/** Cancela a captura em andamento e volta para "idle" */
	cancelCapture: () => void;
	/** (modo hid) Fecha o canal HID e libera o dispositivo */
	disconnect: () => void;
	/** Limpa o template e mensagem de erro, volta para idle */
	reset: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bytesToHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function getHID(): HID | null {
	if (
		typeof navigator === "undefined" ||
		!("hid" in navigator) ||
		typeof (navigator as unknown as { hid: unknown }).hid !== "object"
	) {
		return null;
	}
	return (navigator as unknown as { hid: HID }).hid;
}

function isHIDSupported(): boolean {
	return getHID() !== null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFingerprintReader({
	mode = "keyboard",
	captureTimeoutMs = CAPTURE_TIMEOUT_MS,
}: UseFingerprintReaderOptions = {}): UseFingerprintReaderReturn {
	const isSupported = isHIDSupported() || mode === "keyboard";

	const [isConnected, setIsConnected] = useState(false);
	const [status, setStatus] = useState<FingerprintStatus>("idle");
	const [lastTemplate, setLastTemplate] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [countdown, setCountdown] = useState(0);

	// Refs to avoid stale closures and unnecessary re-renders
	const deviceRef = useRef<HIDDevice | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const hiddenInputRef = useRef<HTMLInputElement | null>(null);
	const isCancelledRef = useRef(false);
	const keyDownListenerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

	// ── Countdown helpers ───────────────────────────────────────────────────────

	const stopCountdown = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		setCountdown(0);
	}, []);

	const startCountdown = useCallback(() => {
		const totalSeconds = Math.floor(captureTimeoutMs / 1000);
		setCountdown(totalSeconds);
		const intervalId = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(intervalId);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		intervalRef.current = intervalId;
	}, [captureTimeoutMs]);

	const clearCaptureTimeout = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	// ── Keyboard mode helpers ───────────────────────────────────────────────────

	const ensureHiddenInput = useCallback((): HTMLInputElement => {
		if (hiddenInputRef.current) return hiddenInputRef.current;

		const input = document.createElement("input");
		input.type = "text";
		input.setAttribute("aria-hidden", "true");
		input.setAttribute("autocomplete", "off");
		input.style.cssText =
			"position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:-9999px;left:-9999px;";
		document.body.appendChild(input);
		hiddenInputRef.current = input;
		return input;
	}, []);

	const removeHiddenInput = useCallback(() => {
		if (keyDownListenerRef.current && hiddenInputRef.current) {
			hiddenInputRef.current.removeEventListener(
				"keydown",
				keyDownListenerRef.current,
			);
			keyDownListenerRef.current = null;
		}
		if (hiddenInputRef.current) {
			hiddenInputRef.current.remove();
			hiddenInputRef.current = null;
		}
	}, []);

	// ── Core: finish / fail capture ─────────────────────────────────────────────

	const finishCapture = useCallback(
		(template: string) => {
			if (isCancelledRef.current) return;
			clearCaptureTimeout();
			stopCountdown();
			setLastTemplate(template);
			setStatus("success");
		},
		[clearCaptureTimeout, stopCountdown],
	);

	const failCapture = useCallback(
		(message: string) => {
			if (isCancelledRef.current) return;
			clearCaptureTimeout();
			stopCountdown();
			setErrorMessage(message);
			setStatus("error");
		},
		[clearCaptureTimeout, stopCountdown],
	);

	// ── Cancel capture (internal, no state update) ──────────────────────────────

	const cancelCaptureInternal = useCallback(() => {
		isCancelledRef.current = true;
		clearCaptureTimeout();
		stopCountdown();

		// Remove keyboard listener cleanly
		if (keyDownListenerRef.current && hiddenInputRef.current) {
			hiddenInputRef.current.removeEventListener(
				"keydown",
				keyDownListenerRef.current,
			);
			keyDownListenerRef.current = null;
		}
		if (hiddenInputRef.current) {
			hiddenInputRef.current.value = "";
		}
	}, [clearCaptureTimeout, stopCountdown]);

	// ── HID mode: connect ────────────────────────────────────────────────────────

	const connect = useCallback(async () => {
		if (mode !== "hid") return;

		const hid = getHID();
		if (!hid) {
			setErrorMessage(
				"Seu navegador não suporta leitores biométricos USB via HID. " +
					"Use Google Chrome ou Microsoft Edge.",
			);
			setStatus("error");
			return;
		}

		try {
			const devices = await hid.requestDevice({
				filters: KNOWN_FINGERPRINT_FILTERS,
			});

			if (!devices.length) {
				setErrorMessage(
					"Nenhum leitor selecionado. Conecte o dispositivo e tente novamente.",
				);
				return;
			}

			const device = devices[0];

			if (!device.opened) {
				await device.open();
			}

			deviceRef.current = device;
			setIsConnected(true);
			setStatus("idle");
			setErrorMessage(null);
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : "Falha ao conectar o leitor.";

			// Usuário cancelou o seletor — não é um erro real
			if (
				msg.toLowerCase().includes("cancelled") ||
				msg.toLowerCase().includes("no device")
			) {
				return;
			}

			setErrorMessage(`Não foi possível conectar o leitor: ${msg}`);
			setStatus("error");
		}
	}, [mode]);

	// ── HID mode: disconnect ─────────────────────────────────────────────────────

	const disconnect = useCallback(() => {
		cancelCaptureInternal();
		if (deviceRef.current?.opened) {
			deviceRef.current.close().catch(() => undefined);
		}
		deviceRef.current = null;
		setIsConnected(false);
		setStatus("idle");
	}, [cancelCaptureInternal]);

	// ── Start capture ────────────────────────────────────────────────────────────

	const startCapture = useCallback(async () => {
		isCancelledRef.current = false;
		setStatus("waiting");
		setLastTemplate(null);
		setErrorMessage(null);
		startCountdown();

		// Global timeout
		timeoutRef.current = setTimeout(() => {
			failCapture("Tempo esgotado. Passe o dedo no leitor e tente novamente.");
		}, captureTimeoutMs);

		// ── Keyboard emulation mode ─────────────────────────────────────────────
		if (mode === "keyboard") {
			const input = ensureHiddenInput();
			input.value = "";
			input.focus();

			// Remove any previous listener
			if (keyDownListenerRef.current) {
				input.removeEventListener("keydown", keyDownListenerRef.current);
			}

			/**
			 * The WA26 in "keyboard emulation" mode types the template characters
			 * and presses Enter at the end. We wait for Enter to collect the value.
			 */
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Enter") {
					e.preventDefault();
					const template = input.value.trim();

					input.removeEventListener("keydown", handleKeyDown);
					keyDownListenerRef.current = null;

					if (!template) {
						failCapture("Leitura vazia. Tente novamente.");
						return;
					}

					// Brief "reading" visual feedback
					setStatus("reading");
					setTimeout(() => {
						finishCapture(template);
					}, 300);
				}
			};

			keyDownListenerRef.current = handleKeyDown;
			input.addEventListener("keydown", handleKeyDown);
			return;
		}

		// ── HID raw mode ────────────────────────────────────────────────────────
		if (mode === "hid") {
			const device = deviceRef.current;

			if (!device || !device.opened) {
				clearCaptureTimeout();
				stopCountdown();
				setErrorMessage(
					"Leitor não conectado. Clique em 'Conectar Leitor' primeiro.",
				);
				setStatus("error");
				return;
			}

			const handleInputReport = (event: Event) => {
				const reportEvent = event as HIDInputReportEvent;
				const hex = bytesToHex(reportEvent.data.buffer as ArrayBuffer);
				if (!hex || hex === "0".repeat(hex.length)) return; // ignore empty reports

				setStatus("reading");
				device.removeEventListener("inputreport", handleInputReport);

				setTimeout(() => {
					finishCapture(hex);
				}, 300);
			};

			device.addEventListener("inputreport", handleInputReport);
		}
	}, [
		mode,
		captureTimeoutMs,
		startCountdown,
		clearCaptureTimeout,
		stopCountdown,
		ensureHiddenInput,
		finishCapture,
		failCapture,
	]);

	// ── Cancel capture ──────────────────────────────────────────────────────────

	const cancelCapture = useCallback(() => {
		cancelCaptureInternal();
		setStatus("idle");
		setErrorMessage(null);
	}, [cancelCaptureInternal]);

	// ── Reset ────────────────────────────────────────────────────────────────────

	const reset = useCallback(() => {
		cancelCaptureInternal();
		setLastTemplate(null);
		setErrorMessage(null);
		setStatus("idle");
	}, [cancelCaptureInternal]);

	// ── Cleanup on unmount ───────────────────────────────────────────────────────

	useEffect(() => {
		return () => {
			isCancelledRef.current = true;
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
			if (intervalRef.current) clearInterval(intervalRef.current);
			removeHiddenInput();
			if (deviceRef.current?.opened) {
				deviceRef.current.close().catch(() => undefined);
			}
		};
	}, [removeHiddenInput]);

	// ── HID disconnect event ─────────────────────────────────────────────────────

	useEffect(() => {
		if (mode !== "hid") return;

		const hid = getHID();
		if (!hid) return;

		const handleDisconnect = (e: HIDConnectionEvent) => {
			if (e.device === deviceRef.current) {
				deviceRef.current = null;
				setIsConnected(false);
				setStatus((prev) => {
					if (prev === "waiting" || prev === "reading") {
						setErrorMessage(
							"Leitor desconectado durante a leitura. Reconecte e tente novamente.",
						);
						return "error";
					}
					return "idle";
				});
			}
		};

		hid.addEventListener("disconnect", handleDisconnect);
		return () => {
			hid.removeEventListener("disconnect", handleDisconnect);
		};
	}, [mode]);

	// ── Return ────────────────────────────────────────────────────────────────────

	return {
		isSupported,
		isConnected,
		status,
		lastTemplate,
		errorMessage,
		countdown,
		connect,
		startCapture,
		cancelCapture,
		disconnect,
		reset,
	};
}
