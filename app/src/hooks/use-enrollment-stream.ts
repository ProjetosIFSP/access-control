import { useCallback, useEffect, useRef, useState } from "react";

/// <reference types="vite/client" />

declare const __API_BASE_URL__: string | undefined;
const API_BASE_URL =
	(typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : undefined) ??
	(typeof import.meta !== "undefined"
		? (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
		: undefined) ??
	"http://localhost:3333";

// ── Types ─────────────────────────────────────────────────────────────────────

export type EnrollmentStep =
	| "idle"
	| "requesting"
	| "WAITING_FIRST"
	| "FIRST_CAPTURED"
	| "SECOND_CAPTURED"
	| "CREATING_MODEL"
	| "EXTRACTING"
	| "ENROLLED"
	| "FAILED"
	| "EXPIRED";

const STEP_LABELS: Record<EnrollmentStep, string> = {
	idle: "",
	requesting: "Iniciando cadastro…",
	WAITING_FIRST: "Encoste o dedo no leitor",
	FIRST_CAPTURED: "Levante e encoste novamente",
	SECOND_CAPTURED: "Biometria capturada. Processando…",
	CREATING_MODEL: "Biometria capturada. Processando…",
	EXTRACTING: "Biometria capturada. Processando…",
	ENROLLED: "Digital cadastrada com sucesso!",
	FAILED: "Falha no cadastro. Tente novamente.",
	EXPIRED: "Tempo esgotado. Tente novamente.",
};

export interface UseEnrollmentStreamOptions {
	controllerId: string | null;
}

export interface UseEnrollmentStreamReturn {
	/** Current step of the enrollment process */
	step: EnrollmentStep;
	/** Human-readable label for the current step */
	stepLabel: string;
	/** Whether enrollment is actively in progress */
	isActive: boolean;
	/** Whether enrollment completed (success or failure) */
	isTerminal: boolean;
	/** Start listening for enrollment progress */
	start: () => void;
	/** Reset to idle state and close SSE */
	reset: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useEnrollmentStream({
	controllerId,
}: UseEnrollmentStreamOptions): UseEnrollmentStreamReturn {
	const [step, setStep] = useState<EnrollmentStep>("idle");
	const [active, setActive] = useState(false);
	const esRef = useRef<EventSource | null>(null);

	const start = useCallback(() => {
		setStep("requesting");
		setActive(true);
	}, []);

	const reset = useCallback(() => {
		setStep("idle");
		setActive(false);
		if (esRef.current) {
			esRef.current.close();
			esRef.current = null;
		}
	}, []);

	useEffect(() => {
		if (esRef.current) {
			esRef.current.close();
			esRef.current = null;
		}

		if (!active || !controllerId) {
			return;
		}

		const url = `${API_BASE_URL}/iot/devices/${encodeURIComponent(controllerId)}/enrollment-progress`;
		const es = new EventSource(url);
		esRef.current = es;

		es.onmessage = (event) => {
			if (event.data === "connected") return;

			try {
				const payload = JSON.parse(event.data) as {
					step: string;
					enrollmentId: string;
				};

				if (payload.step) {
					setStep(payload.step as EnrollmentStep);

					// Auto-close on terminal states
					if (
						payload.step === "ENROLLED" ||
						payload.step === "FAILED" ||
						payload.step === "EXPIRED"
					) {
						setActive(false);
					}
				}
			} catch {
				// Ignore malformed messages
			}
		};

		es.onerror = () => {
			// SSE will auto-reconnect
		};

		return () => {
			es.close();
			esRef.current = null;
		};
	}, [active, controllerId]);

	const isTerminal =
		step === "ENROLLED" || step === "FAILED" || step === "EXPIRED";
	const isActive =
		active || (step !== "idle" && !isTerminal);

	return {
		step,
		stepLabel: STEP_LABELS[step] ?? "",
		isActive,
		isTerminal,
		start,
		reset,
	};
}
