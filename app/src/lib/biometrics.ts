// ── Finger Keys ───────────────────────────────────────────────────────────────

export type FingerKey =
  | "right_thumb"
  | "right_index"
  | "right_middle"
  | "right_ring"
  | "right_pinky"
  | "left_thumb"
  | "left_index"
  | "left_middle"
  | "left_ring"
  | "left_pinky";

// ── Finger Metadata ───────────────────────────────────────────────────────────

export const FINGER_LABELS: Record<FingerKey, string> = {
  right_thumb: "Polegar direito",
  right_index: "Indicador direito",
  right_middle: "Médio direito",
  right_ring: "Anelar direito",
  right_pinky: "Mínimo direito",
  left_thumb: "Polegar esquerdo",
  left_index: "Indicador esquerdo",
  left_middle: "Médio esquerdo",
  left_ring: "Anelar esquerdo",
  left_pinky: "Mínimo esquerdo",
};

export const FINGERS_RIGHT: FingerKey[] = [
  "right_thumb",
  "right_index",
  "right_middle",
  "right_ring",
  "right_pinky",
];

export const FINGERS_LEFT: FingerKey[] = [
  "left_thumb",
  "left_index",
  "left_middle",
  "left_ring",
  "left_pinky",
];

export const ALL_FINGERS: FingerKey[] = [...FINGERS_RIGHT, ...FINGERS_LEFT];

// ── Fingerprint Status ────────────────────────────────────────────────────────

export type FingerprintStatus =
  | "idle"
  | "waiting"
  | "reading"
  | "success"
  | "error";

// ── Registered Fingerprint ────────────────────────────────────────────────────

export interface RegisteredFingerprint {
  /** UUID do access_credential no banco */
  id: string;
  /** Qual dedo esta digital representa */
  finger: FingerKey;
  /** Se a credencial está ativa no sistema */
  isActive: boolean;
  /** ISO 8601 */
  createdAt: string;
}

// ── SVG Hot-zone coords ───────────────────────────────────────────────────────

/**
 * Coordenadas de uma hot-zone circular sobre o SVG da mão.
 * Valores relativos ao viewBox correspondente.
 */
export interface FingerHotZone {
  cx: number;
  cy: number;
  /** Raio da área clicável */
  r: number;
  /**
   * Rotação em graus aplicada ao ícone de digital para acompanhar
   * a inclinação natural do dedo sobre o SVG da mão.
   * 0 = vertical (sem rotação). Positivo = horário, negativo = anti-horário.
   */
  rotation?: number;
}

/**
 * Mapa de hot-zones para a mão direita (viewBox 0 0 512 512).
 *
 * As coordenadas foram calculadas visualmente sobre o path da mão,
 * posicionando cada círculo sobre a ponta de cada dedo.
 */
export const RIGHT_HAND_ZONES: Record<
  "right_thumb" | "right_index" | "right_middle" | "right_ring" | "right_pinky",
  FingerHotZone
> = {
  // Polegar aponta para baixo/lateral — rotação forte anti-horária
  right_thumb: { cx: 45, cy: 415, r: 34, rotation: -50 },
  // Indicador inclinado levemente para a esquerda
  right_index: { cx: 110, cy: 120, r: 32, rotation: -18 },
  // Médio praticamente vertical
  right_middle: { cx: 225, cy: 45, r: 32, rotation: -4 },
  // Anelar inclinado levemente para a direita
  right_ring: { cx: 342, cy: 55, r: 30, rotation: 10 },
  // Mínimo mais inclinado para a direita
  right_pinky: { cx: 455, cy: 135, r: 26, rotation: 35 },
};

/**
 * Mapa de hot-zones para a mão esquerda (viewBox 0 0 496 496).
 *
 * A mão esquerda é o espelho da direita; os valores de cx são
 * ajustados para o viewBox 496.
 */
export const LEFT_HAND_ZONES: Record<
  "left_thumb" | "left_index" | "left_middle" | "left_ring" | "left_pinky",
  FingerHotZone
> = {
  // Polegar da mão esquerda espelha o direito — rotação forte horária
  left_thumb: { cx: 450, cy: 415, r: 34, rotation: 90 },
  // Indicador inclinado levemente para a direita (espelho)
  left_index: { cx: 390, cy: 120, r: 32, rotation: 18 },
  // Médio praticamente vertical
  left_middle: { cx: 268, cy: 45, r: 32, rotation: 4 },
  // Anelar inclinado levemente para a esquerda (espelho)
  left_ring: { cx: 154, cy: 55, r: 30, rotation: -10 },
  // Mínimo mais inclinado para a esquerda (espelho)
  left_pinky: { cx: 40, cy: 135, r: 26, rotation: -22 },
};

/**
 * Mapa de hot-zones da mão direita para o SVG de Halloween (viewBox 0 0 146 146).
 */
export const RIGHT_HAND_HALLOWEEN_ZONES: Record<
  "right_thumb" | "right_index" | "right_middle" | "right_ring" | "right_pinky",
  FingerHotZone
> = {
  right_thumb: { cx: 74, cy: 12, r: 10, rotation: 0 },
  right_index: { cx: 103, cy: 18, r: 9, rotation: 20 },
  right_middle: { cx: 42, cy: 19, r: 9, rotation: -20 },
  right_ring: { cx: 133, cy: 34, r: 8, rotation: 35 },
  right_pinky: { cx: 21, cy: 70, r: 8, rotation: -40 },
};

/**
 * Mapa de hot-zones da mão esquerda para o SVG de Halloween (viewBox 0 0 146 146).
 */
export const LEFT_HAND_HALLOWEEN_ZONES: Record<
  "left_thumb" | "left_index" | "left_middle" | "left_ring" | "left_pinky",
  FingerHotZone
> = {
  left_thumb: { cx: 73, cy: 12, r: 10, rotation: 10 },
  left_index: { cx: 40, cy: 18, r: 9, rotation: -20 },
  left_middle: { cx: 104, cy: 19, r: 9, rotation: 20 },
  left_ring: { cx: 13, cy: 34, r: 8, rotation: -35 },
  left_pinky: { cx: 125, cy: 70, r: 8, rotation: 40 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Retorna true se o dedo dado já possui digital cadastrada. */
export function isFingerRegistered(
  finger: FingerKey,
  registered: RegisteredFingerprint[],
): boolean {
  return registered.some((f) => f.finger === finger && f.isActive);
}

/** Retorna a digital cadastrada para um dedo específico, ou undefined. */
export function getFingerprintForFinger(
  finger: FingerKey,
  registered: RegisteredFingerprint[],
): RegisteredFingerprint | undefined {
  return registered.find((f) => f.finger === finger);
}

/** Conta quantas digitais estão cadastradas em uma lista de dedos. */
export function countRegisteredInSet(
  fingers: FingerKey[],
  registered: RegisteredFingerprint[],
): number {
  return fingers.filter((f) => isFingerRegistered(f, registered)).length;
}
