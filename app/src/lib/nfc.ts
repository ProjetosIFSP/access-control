/**
 * Normaliza um UID NFC removendo separadores (: - espaço) e convertendo para maiúsculas.
 * Exemplo: "a1:b2:c3:d4" -> "A1B2C3D4"
 */
export function normalizeUid(raw: string): string {
    return raw.replace(/[:\s-]/g, "").toUpperCase();
}

/**
 * Formata um UID hexadecimal para exibição visual com separadores ":".
 * Exemplo: "A1B2C3D4" -> "A1:B2:C3:D4"
 */
export function formatUid(uid: string): string {
    const clean = normalizeUid(uid);
    // Agrupa a cada 2 caracteres hexadecimais
    const matches = clean.match(/.{1,2}/g);
    return matches ? matches.join(":") : clean;
}

/**
 * Valida se a string é um UID hexadecimal válido (entre 4 e 14 caracteres, 2-7 bytes).
 */
export function isValidUid(uid: string): boolean {
    const clean = normalizeUid(uid);
    return /^[A-F0-9]{4,14}$/.test(clean);
}

export const NFC_UID_REGEX = /^[A-F0-9]{4,14}$/;
