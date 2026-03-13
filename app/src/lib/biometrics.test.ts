import { describe, expect, it } from "vitest";
import {
	ALL_FINGERS,
	countRegisteredInSet,
	FINGER_LABELS,
	FINGERS_LEFT,
	FINGERS_RIGHT,
	type FingerKey,
	getFingerprintForFinger,
	isFingerRegistered,
	LEFT_HAND_ZONES,
	type RegisteredFingerprint,
	RIGHT_HAND_ZONES,
} from "./biometrics";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFp(
	finger: FingerKey,
	overrides?: Partial<RegisteredFingerprint>,
): RegisteredFingerprint {
	return {
		id: `fp-${finger}`,
		finger,
		isActive: true,
		createdAt: "2025-01-01T00:00:00.000Z",
		...overrides,
	};
}

// ── FINGER_LABELS ─────────────────────────────────────────────────────────────

describe("FINGER_LABELS", () => {
	it("tem uma label para cada dedo", () => {
		const allFingers: FingerKey[] = [
			"right_thumb",
			"right_index",
			"right_middle",
			"right_ring",
			"right_pinky",
			"left_thumb",
			"left_index",
			"left_middle",
			"left_ring",
			"left_pinky",
		];
		for (const finger of allFingers) {
			expect(FINGER_LABELS[finger]).toBeTruthy();
			expect(typeof FINGER_LABELS[finger]).toBe("string");
		}
	});

	it("labels dos dedos direitos contêm 'direito'", () => {
		for (const finger of FINGERS_RIGHT) {
			expect(FINGER_LABELS[finger]).toMatch(/direito/i);
		}
	});

	it("labels dos dedos esquerdos contêm 'esquerdo'", () => {
		for (const finger of FINGERS_LEFT) {
			expect(FINGER_LABELS[finger]).toMatch(/esquerdo/i);
		}
	});

	it("polegar direito tem label correta", () => {
		expect(FINGER_LABELS.right_thumb).toBe("Polegar direito");
	});

	it("indicador esquerdo tem label correta", () => {
		expect(FINGER_LABELS.left_index).toBe("Indicador esquerdo");
	});
});

// ── FINGERS_RIGHT / FINGERS_LEFT / ALL_FINGERS ────────────────────────────────

describe("FINGERS_RIGHT", () => {
	it("contém exatamente 5 dedos", () => {
		expect(FINGERS_RIGHT).toHaveLength(5);
	});

	it("todos os dedos começam com right_", () => {
		for (const f of FINGERS_RIGHT) {
			expect(f).toMatch(/^right_/);
		}
	});

	it("contém polegar, indicador, médio, anelar e mínimo", () => {
		expect(FINGERS_RIGHT).toContain("right_thumb");
		expect(FINGERS_RIGHT).toContain("right_index");
		expect(FINGERS_RIGHT).toContain("right_middle");
		expect(FINGERS_RIGHT).toContain("right_ring");
		expect(FINGERS_RIGHT).toContain("right_pinky");
	});

	it("não contém dedos esquerdos", () => {
		for (const f of FINGERS_RIGHT) {
			expect(f).not.toMatch(/^left_/);
		}
	});
});

describe("FINGERS_LEFT", () => {
	it("contém exatamente 5 dedos", () => {
		expect(FINGERS_LEFT).toHaveLength(5);
	});

	it("todos os dedos começam com left_", () => {
		for (const f of FINGERS_LEFT) {
			expect(f).toMatch(/^left_/);
		}
	});

	it("contém polegar, indicador, médio, anelar e mínimo", () => {
		expect(FINGERS_LEFT).toContain("left_thumb");
		expect(FINGERS_LEFT).toContain("left_index");
		expect(FINGERS_LEFT).toContain("left_middle");
		expect(FINGERS_LEFT).toContain("left_ring");
		expect(FINGERS_LEFT).toContain("left_pinky");
	});

	it("não contém dedos direitos", () => {
		for (const f of FINGERS_LEFT) {
			expect(f).not.toMatch(/^right_/);
		}
	});
});

describe("ALL_FINGERS", () => {
	it("contém exatamente 10 dedos", () => {
		expect(ALL_FINGERS).toHaveLength(10);
	});

	it("é a união de FINGERS_RIGHT e FINGERS_LEFT", () => {
		expect(ALL_FINGERS).toEqual([...FINGERS_RIGHT, ...FINGERS_LEFT]);
	});

	it("não tem duplicatas", () => {
		const set = new Set(ALL_FINGERS);
		expect(set.size).toBe(ALL_FINGERS.length);
	});
});

// ── isFingerRegistered ────────────────────────────────────────────────────────

describe("isFingerRegistered", () => {
	it("retorna false para lista vazia", () => {
		expect(isFingerRegistered("right_thumb", [])).toBe(false);
	});

	it("retorna true quando o dedo está cadastrado e ativo", () => {
		const registered = [makeFp("right_index")];
		expect(isFingerRegistered("right_index", registered)).toBe(true);
	});

	it("retorna false quando o dedo não está na lista", () => {
		const registered = [makeFp("right_index")];
		expect(isFingerRegistered("right_thumb", registered)).toBe(false);
	});

	it("retorna false quando o dedo está cadastrado mas isActive=false", () => {
		const registered = [makeFp("right_index", { isActive: false })];
		expect(isFingerRegistered("right_index", registered)).toBe(false);
	});

	it("retorna true mesmo com múltiplas entradas, se uma for ativa", () => {
		const registered = [
			makeFp("right_middle", { isActive: false }),
			makeFp("right_index"),
			makeFp("right_ring"),
		];
		expect(isFingerRegistered("right_index", registered)).toBe(true);
	});

	it("ignora outros dedos com isActive=true quando procura um específico", () => {
		const registered = [makeFp("left_thumb"), makeFp("left_pinky")];
		expect(isFingerRegistered("right_thumb", registered)).toBe(false);
	});

	it("funciona para todos os 10 dedos possíveis", () => {
		const registered = ALL_FINGERS.map((f) => makeFp(f));
		for (const finger of ALL_FINGERS) {
			expect(isFingerRegistered(finger, registered)).toBe(true);
		}
	});
});

// ── getFingerprintForFinger ───────────────────────────────────────────────────

describe("getFingerprintForFinger", () => {
	it("retorna undefined para lista vazia", () => {
		expect(getFingerprintForFinger("right_thumb", [])).toBeUndefined();
	});

	it("retorna o registro correto quando o dedo existe", () => {
		const fp = makeFp("right_index");
		const registered = [makeFp("right_thumb"), fp, makeFp("right_middle")];
		expect(getFingerprintForFinger("right_index", registered)).toEqual(fp);
	});

	it("retorna undefined quando o dedo não existe na lista", () => {
		const registered = [makeFp("right_thumb"), makeFp("right_index")];
		expect(getFingerprintForFinger("right_middle", registered)).toBeUndefined();
	});

	it("retorna o registro mesmo com isActive=false", () => {
		const fp = makeFp("right_ring", { isActive: false });
		const registered = [fp];
		expect(getFingerprintForFinger("right_ring", registered)).toEqual(fp);
	});

	it("retorna o primeiro registro encontrado quando há múltiplos (mesmo dedo)", () => {
		const fp1 = makeFp("left_index", { id: "fp-1" });
		const fp2 = makeFp("left_index", { id: "fp-2" });
		const result = getFingerprintForFinger("left_index", [fp1, fp2]);
		expect(result).toEqual(fp1);
	});

	it("retorna o objeto correto com todas as propriedades", () => {
		const fp = makeFp("left_thumb", {
			id: "custom-id",
			isActive: false,
			createdAt: "2024-12-25T10:30:00.000Z",
		});
		const result = getFingerprintForFinger("left_thumb", [fp]);
		expect(result).toMatchObject({
			id: "custom-id",
			finger: "left_thumb",
			isActive: false,
			createdAt: "2024-12-25T10:30:00.000Z",
		});
	});
});

// ── countRegisteredInSet ──────────────────────────────────────────────────────

describe("countRegisteredInSet", () => {
	it("retorna 0 para lista vazia de registros", () => {
		expect(countRegisteredInSet(FINGERS_RIGHT, [])).toBe(0);
	});

	it("retorna 0 para conjunto de dedos vazio", () => {
		const registered = [makeFp("right_thumb")];
		expect(countRegisteredInSet([], registered)).toBe(0);
	});

	it("conta corretamente quando todos os dedos de um lado estão cadastrados", () => {
		const registered = FINGERS_RIGHT.map((f) => makeFp(f));
		expect(countRegisteredInSet(FINGERS_RIGHT, registered)).toBe(5);
	});

	it("conta corretamente com dedos parcialmente cadastrados", () => {
		const registered = [
			makeFp("right_thumb"),
			makeFp("right_index"),
			makeFp("right_middle"),
		];
		expect(countRegisteredInSet(FINGERS_RIGHT, registered)).toBe(3);
	});

	it("não conta dedos com isActive=false", () => {
		const registered = [
			makeFp("right_thumb"),
			makeFp("right_index", { isActive: false }),
		];
		expect(countRegisteredInSet(FINGERS_RIGHT, registered)).toBe(1);
	});

	it("não conta dedos do lado oposto", () => {
		const registered = FINGERS_LEFT.map((f) => makeFp(f));
		expect(countRegisteredInSet(FINGERS_RIGHT, registered)).toBe(0);
	});

	it("conta corretamente no conjunto da mão esquerda", () => {
		const registered = [makeFp("left_thumb"), makeFp("left_pinky")];
		expect(countRegisteredInSet(FINGERS_LEFT, registered)).toBe(2);
	});

	it("conta todos os 10 dedos quando completo", () => {
		const registered = ALL_FINGERS.map((f) => makeFp(f));
		expect(countRegisteredInSet(ALL_FINGERS, registered)).toBe(10);
	});

	it("ignora registros de dedos que não pertencem ao conjunto passado", () => {
		const registered = [
			makeFp("right_thumb"),
			makeFp("left_thumb"), // não está em FINGERS_RIGHT
		];
		expect(countRegisteredInSet(FINGERS_RIGHT, registered)).toBe(1);
	});
});

// ── RIGHT_HAND_ZONES / LEFT_HAND_ZONES ────────────────────────────────────────

describe("RIGHT_HAND_ZONES", () => {
	it("contém hot-zones para todos os 5 dedos direitos", () => {
		for (const finger of FINGERS_RIGHT) {
			expect(RIGHT_HAND_ZONES).toHaveProperty(finger);
		}
	});

	it("cada hot-zone tem cx, cy e r numéricos positivos", () => {
		for (const finger of FINGERS_RIGHT) {
			const zone = RIGHT_HAND_ZONES[finger as keyof typeof RIGHT_HAND_ZONES];
			expect(typeof zone.cx).toBe("number");
			expect(typeof zone.cy).toBe("number");
			expect(typeof zone.r).toBe("number");
			expect(zone.cx).toBeGreaterThan(0);
			expect(zone.cy).toBeGreaterThan(0);
			expect(zone.r).toBeGreaterThan(0);
		}
	});

	it("coordenadas estão dentro do viewBox 512x512 (com margem do raio)", () => {
		for (const finger of FINGERS_RIGHT) {
			const zone = RIGHT_HAND_ZONES[finger as keyof typeof RIGHT_HAND_ZONES];
			expect(zone.cx - zone.r).toBeGreaterThanOrEqual(0);
			expect(zone.cy - zone.r).toBeGreaterThanOrEqual(0);
			expect(zone.cx + zone.r).toBeLessThanOrEqual(512);
			expect(zone.cy + zone.r).toBeLessThanOrEqual(512);
		}
	});
});

describe("LEFT_HAND_ZONES", () => {
	it("contém hot-zones para todos os 5 dedos esquerdos", () => {
		for (const finger of FINGERS_LEFT) {
			expect(LEFT_HAND_ZONES).toHaveProperty(finger);
		}
	});

	it("cada hot-zone tem cx, cy e r numéricos positivos", () => {
		for (const finger of FINGERS_LEFT) {
			const zone = LEFT_HAND_ZONES[finger as keyof typeof LEFT_HAND_ZONES];
			expect(typeof zone.cx).toBe("number");
			expect(typeof zone.cy).toBe("number");
			expect(typeof zone.r).toBe("number");
			expect(zone.cx).toBeGreaterThan(0);
			expect(zone.cy).toBeGreaterThan(0);
			expect(zone.r).toBeGreaterThan(0);
		}
	});

	it("coordenadas estão dentro do viewBox 496x496 (com margem do raio)", () => {
		for (const finger of FINGERS_LEFT) {
			const zone = LEFT_HAND_ZONES[finger as keyof typeof LEFT_HAND_ZONES];
			expect(zone.cx - zone.r).toBeGreaterThanOrEqual(0);
			expect(zone.cy - zone.r).toBeGreaterThanOrEqual(0);
			expect(zone.cx + zone.r).toBeLessThanOrEqual(496);
			expect(zone.cy + zone.r).toBeLessThanOrEqual(496);
		}
	});

	it("polegar esquerdo está do lado direito do viewBox (espelho do polegar direito)", () => {
		// Na mão esquerda o polegar fica no lado direito do SVG (cx alto)
		expect(LEFT_HAND_ZONES.left_thumb.cx).toBeGreaterThan(
			LEFT_HAND_ZONES.left_index.cx,
		);
	});
});

// ── RegisteredFingerprint shape ───────────────────────────────────────────────

describe("RegisteredFingerprint", () => {
	it("makeFp helper cria objeto válido", () => {
		const fp = makeFp("right_thumb");
		expect(fp.id).toBe("fp-right_thumb");
		expect(fp.finger).toBe("right_thumb");
		expect(fp.isActive).toBe(true);
		expect(fp.createdAt).toBe("2025-01-01T00:00:00.000Z");
	});

	it("makeFp com overrides aplica corretamente", () => {
		const fp = makeFp("left_ring", { id: "override-id", isActive: false });
		expect(fp.id).toBe("override-id");
		expect(fp.finger).toBe("left_ring");
		expect(fp.isActive).toBe(false);
	});
});

// ── Edge cases e regressões ───────────────────────────────────────────────────

describe("casos extremos", () => {
	it("isFingerRegistered: lista com apenas dedos inativos retorna false", () => {
		const allInactive = ALL_FINGERS.map((f) => makeFp(f, { isActive: false }));
		for (const finger of ALL_FINGERS) {
			expect(isFingerRegistered(finger, allInactive)).toBe(false);
		}
	});

	it("countRegisteredInSet: lista com todos inativos retorna 0", () => {
		const allInactive = ALL_FINGERS.map((f) => makeFp(f, { isActive: false }));
		expect(countRegisteredInSet(ALL_FINGERS, allInactive)).toBe(0);
	});

	it("getFingerprintForFinger: não confunde dedos com nomes similares", () => {
		const fp = makeFp("right_index");
		const registered = [fp];
		// right_ring não deve ser confundido com right_index
		expect(getFingerprintForFinger("right_ring", registered)).toBeUndefined();
		expect(getFingerprintForFinger("left_index", registered)).toBeUndefined();
	});

	it("isFingerRegistered é consistente com getFingerprintForFinger", () => {
		const registered = [
			makeFp("right_thumb"),
			makeFp("left_pinky", { isActive: false }),
		];

		for (const finger of ALL_FINGERS) {
			const found = getFingerprintForFinger(finger, registered);
			const isRegistered = isFingerRegistered(finger, registered);

			if (found?.isActive) {
				expect(isRegistered).toBe(true);
			} else {
				expect(isRegistered).toBe(false);
			}
		}
	});

	it("countRegisteredInSet é consistente com isFingerRegistered aplicado individualmente", () => {
		const registered = [
			makeFp("right_thumb"),
			makeFp("right_index"),
			makeFp("right_pinky", { isActive: false }),
			makeFp("left_thumb"),
		];

		const count = countRegisteredInSet(FINGERS_RIGHT, registered);
		const manualCount = FINGERS_RIGHT.filter((f) =>
			isFingerRegistered(f, registered),
		).length;

		expect(count).toBe(manualCount);
	});
});
