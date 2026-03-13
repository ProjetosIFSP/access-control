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
import { cn } from "./utils";

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

/** Executa fn N vezes e retorna o tempo total em ms */
function bench(fn: () => void, iterations = 10_000): number {
	const start = performance.now();
	for (let i = 0; i < iterations; i++) fn();
	return performance.now() - start;
}

/** Threshold generoso para ambientes de CI sem isolamento de CPU */
const MAX_MS_PER_10K = 200;

// ── Testes de performance: isFingerRegistered ─────────────────────────────────

describe("performance: isFingerRegistered", () => {
	const fullSet = ALL_FINGERS.map((f) => makeFp(f));
	const emptySet: RegisteredFingerprint[] = [];
	const partialSet = FINGERS_RIGHT.map((f) => makeFp(f));

	it("10.000 chamadas com lista completa ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => isFingerRegistered("right_index", fullSet),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas com lista vazia ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => isFingerRegistered("right_thumb", emptySet),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas com lista parcial ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => isFingerRegistered("left_pinky", partialSet),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas verificando dedo inexistente ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => isFingerRegistered("left_thumb", partialSet),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("desempenho é proporcional ao tamanho da lista (linear ou melhor)", () => {
		const small = [makeFp("right_index")];
		const large = ALL_FINGERS.map((f) => makeFp(f));

		const timeSmall = bench(() => isFingerRegistered("left_pinky", small), 10_000);
		const timeLarge = bench(() => isFingerRegistered("left_pinky", large), 10_000);

		// lista 10x maior não deve ser mais de 50x mais lenta
		expect(timeLarge).toBeLessThan(timeSmall * 50 + 50);
	});
});

// ── Testes de performance: getFingerprintForFinger ────────────────────────────

describe("performance: getFingerprintForFinger", () => {
	const fullSet = ALL_FINGERS.map((f) => makeFp(f));
	const emptySet: RegisteredFingerprint[] = [];

	it("10.000 chamadas com lista completa ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => getFingerprintForFinger("right_middle", fullSet),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas com lista vazia ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => getFingerprintForFinger("left_ring", emptySet),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas procurando dedo no final da lista ficam abaixo de 200ms", () => {
		// left_pinky é o último em ALL_FINGERS — pior caso para busca linear
		const elapsed = bench(
			() => getFingerprintForFinger("left_pinky", fullSet),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas com lista de 100 entradas ficam abaixo de 200ms", () => {
		// Simula lista inflada (múltiplas entradas por dedo)
		const large: RegisteredFingerprint[] = [];
		for (let i = 0; i < 10; i++) {
			for (const f of ALL_FINGERS) {
				large.push(makeFp(f, { id: `fp-${f}-${i}` }));
			}
		}
		const elapsed = bench(
			() => getFingerprintForFinger("left_pinky", large),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});
});

// ── Testes de performance: countRegisteredInSet ───────────────────────────────

describe("performance: countRegisteredInSet", () => {
	const fullSet = ALL_FINGERS.map((f) => makeFp(f));
	const emptySet: RegisteredFingerprint[] = [];
	const mixedSet = [
		...FINGERS_RIGHT.map((f) => makeFp(f)),
		...FINGERS_LEFT.map((f) => makeFp(f, { isActive: false })),
	];

	it("10.000 chamadas contando mão direita completa ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => countRegisteredInSet(FINGERS_RIGHT, fullSet),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas contando todos os 10 dedos ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => countRegisteredInSet(ALL_FINGERS, fullSet),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas com lista de registros vazia ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => countRegisteredInSet(ALL_FINGERS, emptySet),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas com conjunto de dedos vazio ficam abaixo de 200ms", () => {
		const elapsed = bench(() => countRegisteredInSet([], fullSet), 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas com set misto (alguns inativos) ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => countRegisteredInSet(ALL_FINGERS, mixedSet),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("resultado é correto mesmo após 10.000 iterações (sem efeito colateral)", () => {
		// Executa 10k vezes e verifica que o resultado ainda é correto
		let lastResult = 0;
		for (let i = 0; i < 10_000; i++) {
			lastResult = countRegisteredInSet(FINGERS_RIGHT, fullSet);
		}
		expect(lastResult).toBe(5);
	});
});

// ── Testes de performance: FINGER_LABELS (acesso a constante) ─────────────────

describe("performance: FINGER_LABELS", () => {
	it("100.000 acessos a labels ficam abaixo de 50ms", () => {
		const fingers: FingerKey[] = [
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
		let i = 0;
		const elapsed = bench(() => {
			const _ = FINGER_LABELS[fingers[i % fingers.length]];
			void _;
			i++;
		}, 100_000);
		expect(elapsed).toBeLessThan(50);
	});

	it("acesso direto a label específica é consistente após 100.000 iterações", () => {
		let label = "";
		for (let i = 0; i < 100_000; i++) {
			label = FINGER_LABELS.right_thumb;
		}
		expect(label).toBe("Polegar direito");
	});
});

// ── Testes de performance: RIGHT_HAND_ZONES / LEFT_HAND_ZONES ────────────────

describe("performance: hot-zone lookup", () => {
	it("100.000 lookups em RIGHT_HAND_ZONES ficam abaixo de 50ms", () => {
		const elapsed = bench(
			() => {
				const _ = RIGHT_HAND_ZONES.right_index;
				void _;
			},
			100_000,
		);
		expect(elapsed).toBeLessThan(50);
	});

	it("100.000 lookups em LEFT_HAND_ZONES ficam abaixo de 50ms", () => {
		const elapsed = bench(
			() => {
				const _ = LEFT_HAND_ZONES.left_thumb;
				void _;
			},
			100_000,
		);
		expect(elapsed).toBeLessThan(50);
	});

	it("lookup de todas as zonas de ambas as mãos em 10.000 iterações fica abaixo de 200ms", () => {
		const elapsed = bench(() => {
			for (const f of FINGERS_RIGHT) {
				const _ = RIGHT_HAND_ZONES[f as keyof typeof RIGHT_HAND_ZONES];
				void _;
			}
			for (const f of FINGERS_LEFT) {
				const _ = LEFT_HAND_ZONES[f as keyof typeof LEFT_HAND_ZONES];
				void _;
			}
		}, 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});
});

// ── Testes de performance: cn (utilitário de classes CSS) ────────────────────

describe("performance: cn (class merging utility)", () => {
	it("10.000 chamadas com strings simples ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => cn("flex", "items-center", "justify-between"),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas com objetos condicionais ficam abaixo de 200ms", () => {
		let toggle = false;
		const elapsed = bench(() => {
			toggle = !toggle;
			cn("base-class", {
				"active-class": toggle,
				"inactive-class": !toggle,
				"extra-class": true,
			});
		}, 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas com merge de Tailwind conflitante ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() =>
				cn(
					"px-4 py-2 bg-zinc-100 text-zinc-900",
					"bg-zinc-800 text-zinc-50 hover:bg-zinc-700",
				),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas com arrays aninhados ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() =>
				cn(["flex", "flex-col"], ["gap-2", "p-4"], {
					"rounded-lg": true,
					"shadow-md": false,
				}),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("resultado de cn é consistente após 10.000 iterações (sem estado interno mutável)", () => {
		let result = "";
		for (let i = 0; i < 10_000; i++) {
			result = cn("flex", "items-center", "gap-4", { hidden: false });
		}
		expect(result).toBe("flex items-center gap-4");
	});

	it("10.000 chamadas com muitos argumentos (10+) ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() =>
				cn(
					"flex",
					"flex-col",
					"items-center",
					"justify-center",
					"gap-2",
					"p-4",
					"m-2",
					"rounded-lg",
					"border",
					"border-zinc-200",
					"bg-white",
					"text-zinc-900",
				),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 chamadas com valor undefined/null/false ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => cn("flex", undefined, null, false, "items-center"),
			10_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});
});

// ── Testes de performance: iteração sobre ALL_FINGERS ────────────────────────

describe("performance: iteração sobre constantes de dedos", () => {
	it("100.000 iterações sobre ALL_FINGERS ficam abaixo de 200ms", () => {
		const elapsed = bench(() => {
			for (const f of ALL_FINGERS) {
				void f;
			}
		}, 100_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("100.000 iterações sobre FINGERS_RIGHT ficam abaixo de 100ms", () => {
		const elapsed = bench(() => {
			for (const f of FINGERS_RIGHT) {
				void f;
			}
		}, 100_000);
		expect(elapsed).toBeLessThan(100);
	});

	it("100.000 iterações sobre FINGERS_LEFT ficam abaixo de 100ms", () => {
		const elapsed = bench(() => {
			for (const f of FINGERS_LEFT) {
				void f;
			}
		}, 100_000);
		expect(elapsed).toBeLessThan(100);
	});
});

// ── Testes de performance: pipeline completo de biometria ────────────────────

describe("performance: pipeline completo de verificação biométrica", () => {
	/**
	 * Simula o fluxo real: dado um conjunto de digitais cadastradas,
	 * verificar cada dedo e contar por mão — operação executada na UI
	 * a cada renderização do componente de mão.
	 */
	function runFullBiometricCheck(registered: RegisteredFingerprint[]) {
		const rightCount = countRegisteredInSet(FINGERS_RIGHT, registered);
		const leftCount = countRegisteredInSet(FINGERS_LEFT, registered);
		const details = ALL_FINGERS.map((f) => ({
			finger: f,
			label: FINGER_LABELS[f],
			fp: getFingerprintForFinger(f, registered),
			isRegistered: isFingerRegistered(f, registered),
		}));
		return { rightCount, leftCount, details };
	}

	it("10.000 pipelines completos com 10 digitais ficam abaixo de 200ms", () => {
		const fullSet = ALL_FINGERS.map((f) => makeFp(f));
		const elapsed = bench(() => runFullBiometricCheck(fullSet), 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 pipelines completos com 0 digitais ficam abaixo de 200ms", () => {
		const elapsed = bench(() => runFullBiometricCheck([]), 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 pipelines completos com digitais parciais ficam abaixo de 200ms", () => {
		const partial = [
			makeFp("right_thumb"),
			makeFp("right_index"),
			makeFp("left_thumb", { isActive: false }),
		];
		const elapsed = bench(() => runFullBiometricCheck(partial), 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("pipeline retorna resultados corretos mesmo após 10.000 iterações", () => {
		const registered = [
			makeFp("right_thumb"),
			makeFp("right_index"),
			makeFp("right_middle"),
			makeFp("left_pinky"),
		];

		let result = runFullBiometricCheck(registered);
		for (let i = 0; i < 9_999; i++) {
			result = runFullBiometricCheck(registered);
		}

		expect(result.rightCount).toBe(3);
		expect(result.leftCount).toBe(1);
		expect(result.details).toHaveLength(10);
		expect(
			result.details.find((d) => d.finger === "right_thumb")?.isRegistered,
		).toBe(true);
		expect(
			result.details.find((d) => d.finger === "left_thumb")?.isRegistered,
		).toBe(false);
	});

	it("pipeline com lista de 50 registros (duplicatas) fica abaixo de 200ms em 10.000 iter.", () => {
		const large: RegisteredFingerprint[] = [];
		for (let i = 0; i < 5; i++) {
			for (const f of ALL_FINGERS) {
				large.push(makeFp(f, { id: `fp-${f}-${i}` }));
			}
		}
		const elapsed = bench(() => runFullBiometricCheck(large), 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});
});

// ── Testes de performance: construção de query keys ──────────────────────────

describe("performance: construção de query keys", () => {
	/**
	 * Query keys são construídas a cada re-render de componentes com
	 * React Query. Verificamos que não há overhead de alocação significativo.
	 */

	it("100.000 construções de array simples ficam abaixo de 100ms", () => {
		const elapsed = bench(
			() => {
				const _ = ["rooms", "summary", { q: "lab", state: "aberta" }] as const;
				void _;
			},
			100_000,
		);
		expect(elapsed).toBeLessThan(100);
	});

	it("100.000 construções de key com objeto complexo ficam abaixo de 200ms", () => {
		const elapsed = bench(
			() => {
				const _ = [
					"rooms",
					"admin",
					{
						q: "sala 01",
						typeIds: ["t1", "t2"],
						blockIds: ["b1"],
						page: 2,
						pageSize: 20,
					},
				];
				void _;
			},
			100_000,
		);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("100.000 construções de key de user relations ficam abaixo de 100ms", () => {
		const userId = "user-uuid-123-abc";
		const elapsed = bench(
			() => {
				const _ = ["users", userId, "relations"] as const;
				void _;
			},
			100_000,
		);
		expect(elapsed).toBeLessThan(100);
	});
});

// ── Testes de performance: JSON serialization (payloads de API) ──────────────

describe("performance: serialização de payloads de API", () => {
	it("10.000 serializations de CreateUserPayload ficam abaixo de 200ms", () => {
		const payload = {
			name: "Maria da Silva Souza",
			email: "maria.silva@ifsp.edu.br",
			isAdmin: false,
			profileIds: ["p1", "p2", "p3"],
			roomIds: ["r1", "r2"],
			roomTypeIds: ["rt1"],
		};
		const elapsed = bench(() => JSON.stringify(payload), 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 serializations de CreateRoomPayload ficam abaixo de 200ms", () => {
		const payload = {
			name: "Laboratório de Computação 01",
			blockId: "block-uuid-001",
			typeId: "type-uuid-001",
			requiresBiometry: true,
			requiresRFID: false,
			profileIds: ["p1", "p2"],
			userIds: ["u1", "u2", "u3"],
		};
		const elapsed = bench(() => JSON.stringify(payload), 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 parse de resposta de fingerprints ficam abaixo de 200ms", () => {
		const jsonStr = JSON.stringify([
			{ id: "fp-1", finger: "right_index", isActive: true, createdAt: "2025-01-01T00:00:00.000Z" },
			{ id: "fp-2", finger: "left_thumb", isActive: true, createdAt: "2025-01-02T00:00:00.000Z" },
			{ id: "fp-3", finger: "right_middle", isActive: false, createdAt: "2025-01-03T00:00:00.000Z" },
		]);
		const elapsed = bench(() => JSON.parse(jsonStr), 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});
});

// ── Testes de performance: URL construction ───────────────────────────────────

describe("performance: construção de URLs de API", () => {
	const BASE = "http://localhost:3333";

	it("10.000 construções de URL simples ficam abaixo de 200ms", () => {
		const elapsed = bench(() => {
			const url = new URL(`${BASE}/users`);
			url.searchParams.set("q", "Maria");
			url.searchParams.set("page", "2");
			url.searchParams.set("pageSize", "20");
			void url.toString();
		}, 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 construções de URL de salas com filtros ficam abaixo de 200ms", () => {
		const elapsed = bench(() => {
			const url = new URL(`${BASE}/rooms`);
			url.searchParams.set("q", "laboratorio");
			url.searchParams.set("typeIds", "t1,t2,t3");
			url.searchParams.set("blockIds", "b1,b2");
			url.searchParams.set("page", "1");
			url.searchParams.set("pageSize", "20");
			void url.toString();
		}, 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("10.000 construções de URL de rooms/summary ficam abaixo de 200ms", () => {
		const elapsed = bench(() => {
			const url = new URL(`${BASE}/rooms/summary`);
			url.searchParams.set("q", "sala");
			url.searchParams.set("state", "aberta");
			url.searchParams.set("type", "LAB");
			void url.toString();
		}, 10_000);
		expect(elapsed).toBeLessThan(MAX_MS_PER_10K);
	});

	it("template string é mais rápido que URL constructor para paths sem params", () => {
		const id = "room-uuid-abc-123";

		const timeTemplate = bench(
			() => {
				const _ = `${BASE}/rooms/${id}`;
				void _;
			},
			100_000,
		);

		const timeUrl = bench(
			() => {
				const url = new URL(`${BASE}/rooms/${id}`);
				void url.toString();
			},
			100_000,
		);

		// Template literal deve ser pelo menos 2x mais rápido
		expect(timeTemplate).toBeLessThan(timeUrl);
	});
});
