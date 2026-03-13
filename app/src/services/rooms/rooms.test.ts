import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type BlockSummary,
	type BlocksResponse,
	type CreateBlockPayload,
	type CreateRoomPayload,
	type CreateRoomTypePayload,
	type RoomsAdminFilters,
	type RoomSummaryAdmin,
	type RoomType,
	type UpdateBlockPayload,
	type UpdateRoomPayload,
	type UpdateRoomTypePayload,
	blocksQueryOptions,
	createBlock,
	createRoom,
	createRoomType,
	deleteBlock,
	deleteRoom,
	deleteRoomType,
	fetchBlocks,
	fetchRoomAccessLogs,
	fetchRoomRelations,
	fetchRoomsAdmin,
	fetchRoomsSummary,
	fetchRoomTypes,
	roomAccessLogsQueryOptions,
	roomRelationsQueryOptions,
	roomsAdminQueryOptions,
	roomsQueryKeys,
	roomsSummaryQueryOptions,
	roomTypesQueryOptions,
	updateBlock,
	updateRoom,
	updateRoomType,
} from "./index";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRoomAdmin(overrides?: Partial<RoomSummaryAdmin>): RoomSummaryAdmin {
	return {
		id: "room-uuid-001",
		name: "Sala 01",
		blockId: "block-uuid-001",
		blockName: "Bloco A",
		typeId: "type-uuid-001",
		typeAbbreviation: "LAB",
		typeName: "Laboratório",
		requiresBiometry: false,
		requiresRFID: false,
		doorState: "fechada",
		isLocked: null,
		lastStatusUpdateAt: null,
		createdAt: "2025-01-15T10:00:00.000Z",
		...overrides,
	};
}

function makeRoomsAdminResponse(overrides?: {
	result?: RoomSummaryAdmin[];
	total?: number;
	page?: number;
	pageSize?: number;
	totalPages?: number;
}) {
	return {
		result: [makeRoomAdmin()],
		total: 1,
		page: 1,
		pageSize: 20,
		totalPages: 1,
		...overrides,
	};
}

function makeRoomType(overrides?: Partial<RoomType>): RoomType {
	return {
		id: "type-uuid-001",
		name: "Laboratório",
		abbreviation: "LAB",
		...overrides,
	};
}

function makeBlock(overrides?: Partial<BlockSummary>): BlockSummary {
	return {
		id: "block-uuid-001",
		name: "Bloco A",
		...overrides,
	};
}

function mockFetch(status: number, body: unknown) {
	const response = {
		ok: status >= 200 && status < 300,
		status,
		json: vi.fn().mockResolvedValue(body),
	} as unknown as Response;

	return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

function mockFetchThrow(error: Error) {
	return vi.spyOn(globalThis, "fetch").mockRejectedValue(error);
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
	vi.restoreAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── roomsQueryKeys ────────────────────────────────────────────────────────────

describe("roomsQueryKeys", () => {
	it("all retorna ['rooms']", () => {
		expect(roomsQueryKeys.all).toEqual(["rooms"]);
	});

	it("types retorna ['room-types']", () => {
		expect(roomsQueryKeys.types).toEqual(["room-types"]);
	});

	it("blocks retorna ['blocks']", () => {
		expect(roomsQueryKeys.blocks).toEqual(["blocks"]);
	});

	it("summary retorna array contendo 'rooms' e 'summary'", () => {
		const key = roomsQueryKeys.summary({ q: "lab" });
		expect(key).toContain("rooms");
		expect(key).toContain("summary");
	});

	it("summary retorna chaves diferentes para filtros distintos", () => {
		const key1 = roomsQueryKeys.summary({ q: "lab" });
		const key2 = roomsQueryKeys.summary({ q: "sala" });
		expect(key1).not.toEqual(key2);
	});

	it("summary retorna chaves iguais para filtros idênticos", () => {
		const key1 = roomsQueryKeys.summary({ q: "lab", state: "aberta" });
		const key2 = roomsQueryKeys.summary({ q: "lab", state: "aberta" });
		expect(key1).toEqual(key2);
	});

	it("adminList retorna array contendo 'rooms' e 'admin'", () => {
		const key = roomsQueryKeys.adminList();
		expect(key).toContain("rooms");
		expect(key).toContain("admin");
	});

	it("adminList retorna chaves diferentes para filtros distintos", () => {
		const key1 = roomsQueryKeys.adminList({ q: "sala 01" });
		const key2 = roomsQueryKeys.adminList({ q: "sala 02" });
		expect(key1).not.toEqual(key2);
	});

	it("adminList retorna chave estável sem filtros", () => {
		const key1 = roomsQueryKeys.adminList();
		const key2 = roomsQueryKeys.adminList();
		expect(key1).toEqual(key2);
	});

	it("relations contém o id da sala", () => {
		const key = roomsQueryKeys.relations("room-abc");
		expect(key).toContain("room-abc");
	});

	it("relations retorna chaves diferentes para ids distintos", () => {
		const key1 = roomsQueryKeys.relations("room-aaa");
		const key2 = roomsQueryKeys.relations("room-bbb");
		expect(key1).not.toEqual(key2);
	});

	it("accessLogs contém o id da sala", () => {
		const key = roomsQueryKeys.accessLogs("room-xyz");
		expect(key).toContain("room-xyz");
	});

	it("accessLogs retorna chaves diferentes para ids distintos", () => {
		const key1 = roomsQueryKeys.accessLogs("room-001");
		const key2 = roomsQueryKeys.accessLogs("room-002");
		expect(key1).not.toEqual(key2);
	});
});

// ── roomsSummaryQueryOptions ──────────────────────────────────────────────────

describe("roomsSummaryQueryOptions", () => {
	it("queryKey contém 'rooms' e 'summary'", () => {
		const opts = roomsSummaryQueryOptions({});
		expect(opts.queryKey).toContain("rooms");
		expect(opts.queryKey).toContain("summary");
	});

	it("staleTime é maior que 0", () => {
		const opts = roomsSummaryQueryOptions({});
		expect(opts.staleTime).toBeGreaterThan(0);
	});

	it("queryFn é uma função", () => {
		const opts = roomsSummaryQueryOptions({});
		expect(typeof opts.queryFn).toBe("function");
	});

	it("queryKey é estável para filtros idênticos", () => {
		const opts1 = roomsSummaryQueryOptions({ q: "lab" });
		const opts2 = roomsSummaryQueryOptions({ q: "lab" });
		expect(opts1.queryKey).toEqual(opts2.queryKey);
	});
});

// ── roomTypesQueryOptions ─────────────────────────────────────────────────────

describe("roomTypesQueryOptions", () => {
	it("queryKey é ['room-types']", () => {
		expect(roomTypesQueryOptions.queryKey).toEqual(["room-types"]);
	});

	it("staleTime é 5 minutos (300000ms)", () => {
		expect(roomTypesQueryOptions.staleTime).toBe(1000 * 60 * 5);
	});

	it("queryFn é uma função", () => {
		expect(typeof roomTypesQueryOptions.queryFn).toBe("function");
	});
});

// ── roomsAdminQueryOptions ────────────────────────────────────────────────────

describe("roomsAdminQueryOptions", () => {
	it("queryKey contém 'rooms' e 'admin'", () => {
		const opts = roomsAdminQueryOptions();
		expect(opts.queryKey).toContain("rooms");
		expect(opts.queryKey).toContain("admin");
	});

	it("staleTime é maior que 0", () => {
		const opts = roomsAdminQueryOptions();
		expect(opts.staleTime).toBeGreaterThan(0);
	});

	it("queryFn é uma função", () => {
		const opts = roomsAdminQueryOptions();
		expect(typeof opts.queryFn).toBe("function");
	});

	it("queryKey com filtros é diferente de sem filtros", () => {
		const opts1 = roomsAdminQueryOptions();
		const opts2 = roomsAdminQueryOptions({ q: "lab" });
		expect(opts1.queryKey).not.toEqual(opts2.queryKey);
	});
});

// ── blocksQueryOptions ────────────────────────────────────────────────────────

describe("blocksQueryOptions", () => {
	it("queryKey é ['blocks']", () => {
		expect(blocksQueryOptions.queryKey).toEqual(["blocks"]);
	});

	it("staleTime é 5 minutos (300000ms)", () => {
		expect(blocksQueryOptions.staleTime).toBe(1000 * 60 * 5);
	});

	it("queryFn é uma função", () => {
		expect(typeof blocksQueryOptions.queryFn).toBe("function");
	});
});

// ── roomRelationsQueryOptions ─────────────────────────────────────────────────

describe("roomRelationsQueryOptions", () => {
	it("enabled é false quando id é null", () => {
		const opts = roomRelationsQueryOptions(null);
		expect(opts.enabled).toBe(false);
	});

	it("enabled é true quando id é string válida", () => {
		const opts = roomRelationsQueryOptions("room-123");
		expect(opts.enabled).toBe(true);
	});

	it("queryKey contém o id quando fornecido", () => {
		const opts = roomRelationsQueryOptions("room-abc");
		expect(opts.queryKey).toContain("room-abc");
	});

	it("staleTime é maior que 0", () => {
		const opts = roomRelationsQueryOptions("room-1");
		expect(opts.staleTime).toBeGreaterThan(0);
	});
});

// ── roomAccessLogsQueryOptions ────────────────────────────────────────────────

describe("roomAccessLogsQueryOptions", () => {
	it("enabled é false quando id é null", () => {
		const opts = roomAccessLogsQueryOptions(null);
		expect(opts.enabled).toBe(false);
	});

	it("enabled é true quando id é string válida", () => {
		const opts = roomAccessLogsQueryOptions("room-123");
		expect(opts.enabled).toBe(true);
	});

	it("queryKey contém o id da sala", () => {
		const opts = roomAccessLogsQueryOptions("room-abc");
		expect(opts.queryKey).toContain("room-abc");
	});

	it("staleTime é maior que 0", () => {
		const opts = roomAccessLogsQueryOptions("room-1");
		expect(opts.staleTime).toBeGreaterThan(0);
	});

	it("queryKey com limit diferente é diferente", () => {
		const opts1 = roomAccessLogsQueryOptions("room-1", 3);
		const opts2 = roomAccessLogsQueryOptions("room-1", 10);
		expect(opts1.queryKey).not.toEqual(opts2.queryKey);
	});
});

// ── fetchRoomsSummary ─────────────────────────────────────────────────────────

describe("fetchRoomsSummary", () => {
	const mockResponse = {
		authenticated: true,
		isAdmin: false,
		result: [],
	};

	it("retorna resumo das salas em caso de sucesso", async () => {
		mockFetch(200, mockResponse);
		const result = await fetchRoomsSummary({});
		expect(result).toEqual(mockResponse);
	});

	it("chama o endpoint /rooms/summary", async () => {
		const fetchSpy = mockFetch(200, mockResponse);
		await fetchRoomsSummary({});
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/rooms/summary");
	});

	it("adiciona parâmetro q na URL quando fornecido", async () => {
		const fetchSpy = mockFetch(200, mockResponse);
		await fetchRoomsSummary({ q: "laboratorio" });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("q=laboratorio");
	});

	it("não adiciona parâmetro q quando apenas espaços", async () => {
		const fetchSpy = mockFetch(200, mockResponse);
		await fetchRoomsSummary({ q: "   " });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).not.toContain("q=");
	});

	it("adiciona parâmetro type na URL quando fornecido", async () => {
		const fetchSpy = mockFetch(200, mockResponse);
		await fetchRoomsSummary({ type: "LAB" });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("type=LAB");
	});

	it("adiciona parâmetro state na URL quando fornecido", async () => {
		const fetchSpy = mockFetch(200, mockResponse);
		await fetchRoomsSummary({ state: "aberta" });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("state=aberta");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(200, mockResponse);
		await fetchRoomsSummary({});
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("lança erro quando resposta não é ok (500)", async () => {
		mockFetch(500, {});
		await expect(fetchRoomsSummary({})).rejects.toThrow(
			/falha ao carregar o resumo das salas/i,
		);
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Network error"));
		await expect(fetchRoomsSummary({})).rejects.toThrow("Network error");
	});
});

// ── fetchRoomsAdmin ───────────────────────────────────────────────────────────

describe("fetchRoomsAdmin", () => {
	const rawApiResponse = {
		result: [
			{
				room: {
					id: "room-uuid-001",
					name: "Sala 01",
					blockId: "block-uuid-001",
					typeId: "type-uuid-001",
					requiresBiometry: false,
					requiresRFID: false,
					isLocked: null,
					doorState: "fechada",
					lastStatusUpdateAt: null,
					createdAt: "2025-01-15T10:00:00.000Z",
				},
				block: { id: "block-uuid-001", name: "Bloco A" },
			},
		],
		total: 1,
		page: 1,
		pageSize: 20,
		totalPages: 1,
	};

	it("retorna lista de salas mapeada em caso de sucesso", async () => {
		mockFetch(200, rawApiResponse);
		const result = await fetchRoomsAdmin();
		expect(result.result).toHaveLength(1);
		expect(result.result[0].id).toBe("room-uuid-001");
		expect(result.result[0].blockName).toBe("Bloco A");
	});

	it("chama o endpoint /rooms", async () => {
		const fetchSpy = mockFetch(200, rawApiResponse);
		await fetchRoomsAdmin();
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/rooms");
	});

	it("adiciona parâmetro q na URL quando fornecido", async () => {
		const fetchSpy = mockFetch(200, rawApiResponse);
		await fetchRoomsAdmin({ q: "sala 01" });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("q=sala+01");
	});

	it("não adiciona parâmetro q quando apenas espaços", async () => {
		const fetchSpy = mockFetch(200, rawApiResponse);
		await fetchRoomsAdmin({ q: "   " });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).not.toContain("q=");
	});

	it("adiciona typeIds na URL quando fornecido", async () => {
		const fetchSpy = mockFetch(200, rawApiResponse);
		await fetchRoomsAdmin({ typeIds: ["t1", "t2"] });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("typeIds=t1%2Ct2");
	});

	it("não adiciona typeIds quando array vazio", async () => {
		const fetchSpy = mockFetch(200, rawApiResponse);
		await fetchRoomsAdmin({ typeIds: [] });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).not.toContain("typeIds");
	});

	it("adiciona blockIds na URL quando fornecido", async () => {
		const fetchSpy = mockFetch(200, rawApiResponse);
		await fetchRoomsAdmin({ blockIds: ["b1", "b2"] });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("blockIds=b1%2Cb2");
	});

	it("não adiciona blockIds quando array vazio", async () => {
		const fetchSpy = mockFetch(200, rawApiResponse);
		await fetchRoomsAdmin({ blockIds: [] });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).not.toContain("blockIds");
	});

	it("adiciona page e pageSize na URL quando fornecidos", async () => {
		const fetchSpy = mockFetch(200, rawApiResponse);
		await fetchRoomsAdmin({ page: 2, pageSize: 10 });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("page=2");
		expect(url).toContain("pageSize=10");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(200, rawApiResponse);
		await fetchRoomsAdmin();
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("retorna paginação correta", async () => {
		const response = {
			...rawApiResponse,
			page: 3,
			pageSize: 5,
			total: 50,
			totalPages: 10,
		};
		mockFetch(200, response);
		const result = await fetchRoomsAdmin({ page: 3, pageSize: 5 });
		expect(result.page).toBe(3);
		expect(result.pageSize).toBe(5);
		expect(result.total).toBe(50);
		expect(result.totalPages).toBe(10);
	});

	it("mapeia requiresBiometry e requiresRFID corretamente", async () => {
		const response = {
			...rawApiResponse,
			result: [
				{
					...rawApiResponse.result[0],
					room: {
						...rawApiResponse.result[0].room,
						requiresBiometry: true,
						requiresRFID: true,
					},
				},
			],
		};
		mockFetch(200, response);
		const result = await fetchRoomsAdmin();
		expect(result.result[0].requiresBiometry).toBe(true);
		expect(result.result[0].requiresRFID).toBe(true);
	});

	it("trata requiresBiometry null/undefined como false", async () => {
		const response = {
			...rawApiResponse,
			result: [
				{
					...rawApiResponse.result[0],
					room: {
						...rawApiResponse.result[0].room,
						requiresBiometry: null,
						requiresRFID: undefined,
					},
				},
			],
		};
		mockFetch(200, response);
		const result = await fetchRoomsAdmin();
		expect(result.result[0].requiresBiometry).toBe(false);
		expect(result.result[0].requiresRFID).toBe(false);
	});

	it("lança erro quando resposta não é ok (500)", async () => {
		mockFetch(500, {});
		await expect(fetchRoomsAdmin()).rejects.toThrow(/falha ao carregar as salas/i);
	});

	it("lança erro quando resposta não é ok (401)", async () => {
		mockFetch(401, {});
		await expect(fetchRoomsAdmin()).rejects.toThrow();
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Connection refused"));
		await expect(fetchRoomsAdmin()).rejects.toThrow("Connection refused");
	});

	it("retorna lista vazia quando não há salas", async () => {
		mockFetch(200, { ...rawApiResponse, result: [], total: 0, totalPages: 0 });
		const result = await fetchRoomsAdmin();
		expect(result.result).toHaveLength(0);
	});
});

// ── fetchRoomTypes ────────────────────────────────────────────────────────────

describe("fetchRoomTypes", () => {
	it("retorna lista de tipos de sala em caso de sucesso", async () => {
		const data = { result: [makeRoomType()] };
		mockFetch(200, data);
		const result = await fetchRoomTypes();
		expect(result).toEqual(data);
	});

	it("chama o endpoint /room-types", async () => {
		const fetchSpy = mockFetch(200, { result: [] });
		await fetchRoomTypes();
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/room-types");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(200, { result: [] });
		await fetchRoomTypes();
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("lança erro quando resposta não é ok (500)", async () => {
		mockFetch(500, {});
		await expect(fetchRoomTypes()).rejects.toThrow(
			/falha ao carregar os tipos de sala/i,
		);
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Network error"));
		await expect(fetchRoomTypes()).rejects.toThrow("Network error");
	});
});

// ── createRoomType ────────────────────────────────────────────────────────────

describe("createRoomType", () => {
	const payload: CreateRoomTypePayload = {
		name: "Laboratório",
		abbreviation: "LAB",
	};

	it("retorna o tipo criado em caso de sucesso", async () => {
		const created = makeRoomType();
		mockFetch(201, created);
		const result = await createRoomType(payload);
		expect(result).toEqual(created);
	});

	it("chama o endpoint /room-types", async () => {
		const fetchSpy = mockFetch(201, makeRoomType());
		await createRoomType(payload);
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/room-types");
	});

	it("usa método POST", async () => {
		const fetchSpy = mockFetch(201, makeRoomType());
		await createRoomType(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.method).toBe("POST");
	});

	it("envia Content-Type: application/json", async () => {
		const fetchSpy = mockFetch(201, makeRoomType());
		await createRoomType(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const headers = options?.headers as Record<string, string>;
		expect(headers?.["Content-Type"]).toBe("application/json");
	});

	it("serializa name e abbreviation no body", async () => {
		const fetchSpy = mockFetch(201, makeRoomType());
		await createRoomType(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.name).toBe("Laboratório");
		expect(body.abbreviation).toBe("LAB");
	});

	it("inclui description no body quando fornecida", async () => {
		const fetchSpy = mockFetch(201, makeRoomType());
		await createRoomType({ ...payload, description: "Laboratório de informática" });
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.description).toBe("Laboratório de informática");
	});

	it("lança erro com mensagem do servidor em caso de conflito (409)", async () => {
		mockFetch(409, { message: "Tipo de sala já cadastrado" });
		await expect(createRoomType(payload)).rejects.toThrow(/Tipo de sala já cadastrado/i);
	});

	it("lança erro com mensagem genérica quando body não tem message", async () => {
		mockFetch(409, {});
		await expect(createRoomType(payload)).rejects.toThrow(/falha ao criar tipo de sala/i);
	});

	it("lança erro em caso de 500", async () => {
		mockFetch(500, { message: "Erro interno" });
		await expect(createRoomType(payload)).rejects.toThrow("Erro interno");
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Network failure"));
		await expect(createRoomType(payload)).rejects.toThrow("Network failure");
	});
});

// ── updateRoomType ────────────────────────────────────────────────────────────

describe("updateRoomType", () => {
	const payload: UpdateRoomTypePayload = {
		id: "type-abc",
		name: "Sala de Aula",
		abbreviation: "SA",
	};

	it("retorna o tipo atualizado em caso de sucesso", async () => {
		const updated = makeRoomType({ name: "Sala de Aula", abbreviation: "SA" });
		mockFetch(200, updated);
		const result = await updateRoomType(payload);
		expect(result).toEqual(updated);
	});

	it("chama o endpoint /room-types/:id com o ID correto", async () => {
		const fetchSpy = mockFetch(200, makeRoomType());
		await updateRoomType(payload);
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/room-types/type-abc");
	});

	it("usa método PUT", async () => {
		const fetchSpy = mockFetch(200, makeRoomType());
		await updateRoomType(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.method).toBe("PUT");
	});

	it("não inclui o id no body da requisição", async () => {
		const fetchSpy = mockFetch(200, makeRoomType());
		await updateRoomType(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body).not.toHaveProperty("id");
	});

	it("serializa name e abbreviation no body", async () => {
		const fetchSpy = mockFetch(200, makeRoomType());
		await updateRoomType(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.name).toBe("Sala de Aula");
		expect(body.abbreviation).toBe("SA");
	});

	it("lança erro com mensagem do servidor (404)", async () => {
		mockFetch(404, { message: "Tipo de sala não encontrado" });
		await expect(updateRoomType(payload)).rejects.toThrow(/Tipo de sala não encontrado/i);
	});

	it("lança erro com mensagem genérica quando body não tem message", async () => {
		mockFetch(500, {});
		await expect(updateRoomType(payload)).rejects.toThrow(/falha ao atualizar tipo de sala/i);
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Timeout"));
		await expect(updateRoomType(payload)).rejects.toThrow("Timeout");
	});
});

// ── deleteRoomType ────────────────────────────────────────────────────────────

describe("deleteRoomType", () => {
	it("resolve sem retorno em caso de sucesso (204)", async () => {
		const response = {
			ok: true,
			status: 204,
			json: vi.fn().mockRejectedValue(new Error("No body")),
		} as unknown as Response;
		vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

		await expect(deleteRoomType("type-123")).resolves.toBeUndefined();
	});

	it("chama o endpoint /room-types/:id com o ID correto", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteRoomType("type-to-delete");
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/room-types/type-to-delete");
	});

	it("usa método DELETE", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteRoomType("type-123");
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.method).toBe("DELETE");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteRoomType("type-123");
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("lança erro com mensagem do servidor quando não encontrado (404)", async () => {
		mockFetch(404, { message: "Tipo de sala não encontrado" });
		await expect(deleteRoomType("type-ghost")).rejects.toThrow(
			/Tipo de sala não encontrado/i,
		);
	});

	it("lança erro com mensagem genérica quando body não tem message", async () => {
		mockFetch(404, {});
		await expect(deleteRoomType("type-123")).rejects.toThrow(
			/falha ao excluir tipo de sala/i,
		);
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Connection refused"));
		await expect(deleteRoomType("type-123")).rejects.toThrow("Connection refused");
	});
});

// ── createRoom ────────────────────────────────────────────────────────────────

describe("createRoom", () => {
	const payload: CreateRoomPayload = {
		name: "Sala 01",
		blockId: "block-uuid-001",
		typeId: "type-uuid-001",
	};

	it("retorna a sala criada em caso de sucesso", async () => {
		const created = makeRoomAdmin();
		mockFetch(201, created);
		const result = await createRoom(payload);
		expect(result).toEqual(created);
	});

	it("chama o endpoint /rooms", async () => {
		const fetchSpy = mockFetch(201, makeRoomAdmin());
		await createRoom(payload);
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/rooms");
		expect(url).not.toMatch(/\/rooms\/\w/);
	});

	it("usa método POST", async () => {
		const fetchSpy = mockFetch(201, makeRoomAdmin());
		await createRoom(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.method).toBe("POST");
	});

	it("envia Content-Type: application/json", async () => {
		const fetchSpy = mockFetch(201, makeRoomAdmin());
		await createRoom(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const headers = options?.headers as Record<string, string>;
		expect(headers?.["Content-Type"]).toBe("application/json");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(201, makeRoomAdmin());
		await createRoom(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("serializa name, blockId e typeId no body", async () => {
		const fetchSpy = mockFetch(201, makeRoomAdmin());
		await createRoom(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.name).toBe("Sala 01");
		expect(body.blockId).toBe("block-uuid-001");
		expect(body.typeId).toBe("type-uuid-001");
	});

	it("inclui requiresBiometry no body quando fornecido", async () => {
		const fetchSpy = mockFetch(201, makeRoomAdmin());
		await createRoom({ ...payload, requiresBiometry: true });
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.requiresBiometry).toBe(true);
	});

	it("inclui requiresRFID no body quando fornecido", async () => {
		const fetchSpy = mockFetch(201, makeRoomAdmin());
		await createRoom({ ...payload, requiresRFID: true });
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.requiresRFID).toBe(true);
	});

	it("inclui profileIds no body quando fornecido", async () => {
		const fetchSpy = mockFetch(201, makeRoomAdmin());
		await createRoom({ ...payload, profileIds: ["p1", "p2"] });
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.profileIds).toEqual(["p1", "p2"]);
	});

	it("inclui userIds no body quando fornecido", async () => {
		const fetchSpy = mockFetch(201, makeRoomAdmin());
		await createRoom({ ...payload, userIds: ["u1"] });
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.userIds).toEqual(["u1"]);
	});

	it("lança erro com mensagem do servidor em caso de conflito (409)", async () => {
		mockFetch(409, { message: "Sala já cadastrada neste bloco" });
		await expect(createRoom(payload)).rejects.toThrow(/Sala já cadastrada/i);
	});

	it("lança erro com mensagem genérica quando body não tem message", async () => {
		mockFetch(409, {});
		await expect(createRoom(payload)).rejects.toThrow(/falha ao criar sala/i);
	});

	it("lança erro em caso de 500", async () => {
		mockFetch(500, { message: "Erro interno do servidor" });
		await expect(createRoom(payload)).rejects.toThrow("Erro interno do servidor");
	});

	it("lança erro em caso de 401", async () => {
		mockFetch(401, { message: "Autenticação necessária" });
		await expect(createRoom(payload)).rejects.toThrow();
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Network failure"));
		await expect(createRoom(payload)).rejects.toThrow("Network failure");
	});
});

// ── updateRoom ────────────────────────────────────────────────────────────────

describe("updateRoom", () => {
	const payload: UpdateRoomPayload = {
		id: "room-abc",
		name: "Sala 01 Atualizada",
		blockId: "block-uuid-001",
		typeId: "type-uuid-001",
	};

	it("retorna a sala atualizada em caso de sucesso", async () => {
		const updated = makeRoomAdmin({ name: "Sala 01 Atualizada" });
		mockFetch(200, updated);
		const result = await updateRoom(payload);
		expect(result).toEqual(updated);
	});

	it("chama o endpoint /rooms/:id com o ID correto", async () => {
		const fetchSpy = mockFetch(200, makeRoomAdmin());
		await updateRoom(payload);
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/rooms/room-abc");
	});

	it("usa método PUT", async () => {
		const fetchSpy = mockFetch(200, makeRoomAdmin());
		await updateRoom(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.method).toBe("PUT");
	});

	it("envia Content-Type: application/json", async () => {
		const fetchSpy = mockFetch(200, makeRoomAdmin());
		await updateRoom(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const headers = options?.headers as Record<string, string>;
		expect(headers?.["Content-Type"]).toBe("application/json");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(200, makeRoomAdmin());
		await updateRoom(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("não inclui o id no body da requisição", async () => {
		const fetchSpy = mockFetch(200, makeRoomAdmin());
		await updateRoom(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body).not.toHaveProperty("id");
	});

	it("serializa name, blockId e typeId no body", async () => {
		const fetchSpy = mockFetch(200, makeRoomAdmin());
		await updateRoom(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.name).toBe("Sala 01 Atualizada");
		expect(body.blockId).toBe("block-uuid-001");
		expect(body.typeId).toBe("type-uuid-001");
	});

	it("inclui requiresBiometry e requiresRFID no body quando fornecidos", async () => {
		const fetchSpy = mockFetch(200, makeRoomAdmin());
		await updateRoom({ ...payload, requiresBiometry: true, requiresRFID: true });
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.requiresBiometry).toBe(true);
		expect(body.requiresRFID).toBe(true);
	});

	it("usa IDs diferentes na URL para diferentes salas", async () => {
		const fetchSpy = mockFetch(200, makeRoomAdmin());
		await updateRoom({ ...payload, id: "outro-room-xyz" });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/rooms/outro-room-xyz");
	});

	it("lança erro com mensagem do servidor quando sala não encontrada (404)", async () => {
		mockFetch(404, { message: "Sala não encontrada" });
		await expect(updateRoom(payload)).rejects.toThrow(/Sala não encontrada/i);
	});

	it("lança erro com mensagem genérica quando body não tem message", async () => {
		mockFetch(500, {});
		await expect(updateRoom(payload)).rejects.toThrow(/falha ao atualizar sala/i);
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Timeout"));
		await expect(updateRoom(payload)).rejects.toThrow("Timeout");
	});
});

// ── deleteRoom ────────────────────────────────────────────────────────────────

describe("deleteRoom", () => {
	it("resolve sem retorno em caso de sucesso (204)", async () => {
		const response = {
			ok: true,
			status: 204,
			json: vi.fn().mockRejectedValue(new Error("No body")),
		} as unknown as Response;
		vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

		await expect(deleteRoom("room-123")).resolves.toBeUndefined();
	});

	it("chama o endpoint /rooms/:id com o ID correto", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteRoom("room-to-delete");
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/rooms/room-to-delete");
	});

	it("usa método DELETE", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteRoom("room-123");
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.method).toBe("DELETE");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteRoom("room-123");
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("lança erro com mensagem do servidor quando não encontrada (404)", async () => {
		mockFetch(404, { message: "Sala não encontrada" });
		await expect(deleteRoom("room-ghost")).rejects.toThrow(/Sala não encontrada/i);
	});

	it("lança erro com mensagem genérica quando body não tem message", async () => {
		mockFetch(404, {});
		await expect(deleteRoom("room-123")).rejects.toThrow(/falha ao excluir sala/i);
	});

	it("lança erro em caso de 403 (sem permissão)", async () => {
		mockFetch(403, { message: "Sem permissão para excluir esta sala" });
		await expect(deleteRoom("room-123")).rejects.toThrow(/Sem permissão/i);
	});

	it("lança erro em caso de 500", async () => {
		mockFetch(500, { message: "Erro interno do servidor" });
		await expect(deleteRoom("room-123")).rejects.toThrow("Erro interno do servidor");
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Connection refused"));
		await expect(deleteRoom("room-123")).rejects.toThrow("Connection refused");
	});

	it("o ID correto aparece na URL para diferentes salas", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteRoom("specific-room-uuid-789");
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("specific-room-uuid-789");
	});
});

// ── fetchBlocks ───────────────────────────────────────────────────────────────

describe("fetchBlocks", () => {
	it("retorna lista de blocos em caso de sucesso", async () => {
		const data: BlocksResponse = {
			result: [makeBlock(), makeBlock({ id: "block-002", name: "Bloco B" })],
		};
		mockFetch(200, data);
		const result = await fetchBlocks();
		expect(result).toEqual(data);
	});

	it("chama o endpoint /blocks", async () => {
		const fetchSpy = mockFetch(200, { result: [] });
		await fetchBlocks();
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/blocks");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(200, { result: [] });
		await fetchBlocks();
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("lança erro quando resposta não é ok (500)", async () => {
		mockFetch(500, {});
		await expect(fetchBlocks()).rejects.toThrow(/falha ao carregar os blocos/i);
	});

	it("retorna lista vazia quando não há blocos", async () => {
		mockFetch(200, { result: [] });
		const result = await fetchBlocks();
		expect(result.result).toHaveLength(0);
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Network error"));
		await expect(fetchBlocks()).rejects.toThrow("Network error");
	});
});

// ── createBlock ───────────────────────────────────────────────────────────────

describe("createBlock", () => {
	const payload: CreateBlockPayload = { name: "Bloco C" };

	it("retorna o bloco criado em caso de sucesso", async () => {
		const created = makeBlock({ name: "Bloco C" });
		mockFetch(201, created);
		const result = await createBlock(payload);
		expect(result).toEqual(created);
	});

	it("chama o endpoint /blocks", async () => {
		const fetchSpy = mockFetch(201, makeBlock());
		await createBlock(payload);
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/blocks");
		expect(url).not.toMatch(/\/blocks\/\w/);
	});

	it("usa método POST", async () => {
		const fetchSpy = mockFetch(201, makeBlock());
		await createBlock(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.method).toBe("POST");
	});

	it("envia Content-Type: application/json", async () => {
		const fetchSpy = mockFetch(201, makeBlock());
		await createBlock(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const headers = options?.headers as Record<string, string>;
		expect(headers?.["Content-Type"]).toBe("application/json");
	});

	it("serializa o name no body", async () => {
		const fetchSpy = mockFetch(201, makeBlock());
		await createBlock(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.name).toBe("Bloco C");
	});

	it("lança erro com mensagem do servidor em caso de conflito (409)", async () => {
		mockFetch(409, { message: "Bloco já cadastrado" });
		await expect(createBlock(payload)).rejects.toThrow(/Bloco já cadastrado/i);
	});

	it("lança erro com mensagem genérica quando body não tem message", async () => {
		mockFetch(409, {});
		await expect(createBlock(payload)).rejects.toThrow(/falha ao criar bloco/i);
	});

	it("lança erro em caso de 500", async () => {
		mockFetch(500, { message: "Erro interno" });
		await expect(createBlock(payload)).rejects.toThrow("Erro interno");
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Network failure"));
		await expect(createBlock(payload)).rejects.toThrow("Network failure");
	});
});

// ── updateBlock ───────────────────────────────────────────────────────────────

describe("updateBlock", () => {
	const payload: UpdateBlockPayload = { id: "block-abc", name: "Bloco A Renomeado" };

	it("retorna o bloco atualizado em caso de sucesso", async () => {
		const updated = makeBlock({ name: "Bloco A Renomeado" });
		mockFetch(200, updated);
		const result = await updateBlock(payload);
		expect(result).toEqual(updated);
	});

	it("chama o endpoint /blocks/:id com o ID correto", async () => {
		const fetchSpy = mockFetch(200, makeBlock());
		await updateBlock(payload);
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/blocks/block-abc");
	});

	it("usa método PUT", async () => {
		const fetchSpy = mockFetch(200, makeBlock());
		await updateBlock(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.method).toBe("PUT");
	});

	it("não inclui o id no body da requisição", async () => {
		const fetchSpy = mockFetch(200, makeBlock());
		await updateBlock(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body).not.toHaveProperty("id");
	});

	it("serializa o name no body", async () => {
		const fetchSpy = mockFetch(200, makeBlock());
		await updateBlock(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.name).toBe("Bloco A Renomeado");
	});

	it("lança erro com mensagem do servidor quando não encontrado (404)", async () => {
		mockFetch(404, { message: "Bloco não encontrado" });
		await expect(updateBlock(payload)).rejects.toThrow(/Bloco não encontrado/i);
	});

	it("lança erro com mensagem genérica quando body não tem message", async () => {
		mockFetch(500, {});
		await expect(updateBlock(payload)).rejects.toThrow(/falha ao atualizar bloco/i);
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Timeout"));
		await expect(updateBlock(payload)).rejects.toThrow("Timeout");
	});
});

// ── deleteBlock ───────────────────────────────────────────────────────────────

describe("deleteBlock", () => {
	it("resolve sem retorno em caso de sucesso (204)", async () => {
		const response = {
			ok: true,
			status: 204,
			json: vi.fn().mockRejectedValue(new Error("No body")),
		} as unknown as Response;
		vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

		await expect(deleteBlock("block-123")).resolves.toBeUndefined();
	});

	it("chama o endpoint /blocks/:id com o ID correto", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteBlock("block-to-delete");
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/blocks/block-to-delete");
	});

	it("usa método DELETE", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteBlock("block-123");
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.method).toBe("DELETE");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteBlock("block-123");
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("lança erro com mensagem do servidor quando não encontrado (404)", async () => {
		mockFetch(404, { message: "Bloco não encontrado" });
		await expect(deleteBlock("block-ghost")).rejects.toThrow(/Bloco não encontrado/i);
	});

	it("lança erro com mensagem genérica quando body não tem message", async () => {
		mockFetch(404, {});
		await expect(deleteBlock("block-123")).rejects.toThrow(/falha ao excluir bloco/i);
	});

	it("lança erro em caso de 500", async () => {
		mockFetch(500, { message: "Erro interno do servidor" });
		await expect(deleteBlock("block-123")).rejects.toThrow("Erro interno do servidor");
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Connection refused"));
		await expect(deleteBlock("block-123")).rejects.toThrow("Connection refused");
	});
});

// ── fetchRoomRelations ────────────────────────────────────────────────────────

describe("fetchRoomRelations", () => {
	const mockRelations = {
		profiles: [{ id: "p1", name: "Docente", description: "Professor" }],
		users: [{ id: "u1", name: "João", email: "joao@ifsp.edu.br" }],
	};

	it("retorna os vínculos da sala em caso de sucesso", async () => {
		mockFetch(200, mockRelations);
		const result = await fetchRoomRelations("room-123");
		expect(result).toEqual(mockRelations);
	});

	it("chama o endpoint /rooms/:id/relations com o ID correto", async () => {
		const fetchSpy = mockFetch(200, mockRelations);
		await fetchRoomRelations("room-abc");
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/rooms/room-abc/relations");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(200, mockRelations);
		await fetchRoomRelations("room-1");
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("lança erro quando resposta não é ok (404)", async () => {
		mockFetch(404, {});
		await expect(fetchRoomRelations("room-ghost")).rejects.toThrow(
			/falha ao carregar vínculos da sala/i,
		);
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Network error"));
		await expect(fetchRoomRelations("room-1")).rejects.toThrow("Network error");
	});

	it("retorna vínculos vazios quando sala não tem relações", async () => {
		const empty = { profiles: [], users: [] };
		mockFetch(200, empty);
		const result = await fetchRoomRelations("room-new");
		expect(result.profiles).toHaveLength(0);
		expect(result.users).toHaveLength(0);
	});
});

// ── fetchRoomAccessLogs ───────────────────────────────────────────────────────

describe("fetchRoomAccessLogs", () => {
	const mockLogs = {
		logs: [
			{
				id: "log-001",
				status: "granted",
				reason: null,
				timestamp: "2025-01-15T10:00:00.000Z",
				userId: "user-001",
				userName: "João Silva",
				userEmail: "joao@ifsp.edu.br",
			},
		],
	};

	it("retorna logs de acesso em caso de sucesso", async () => {
		mockFetch(200, mockLogs);
		const result = await fetchRoomAccessLogs("room-123");
		expect(result).toEqual(mockLogs);
	});

	it("chama o endpoint /rooms/:id/access-logs com o ID correto", async () => {
		const fetchSpy = mockFetch(200, mockLogs);
		await fetchRoomAccessLogs("room-abc");
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/rooms/room-abc/access-logs");
	});

	it("adiciona parâmetro limit na URL com valor padrão 3", async () => {
		const fetchSpy = mockFetch(200, mockLogs);
		await fetchRoomAccessLogs("room-123");
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("limit=3");
	});

	it("adiciona parâmetro limit personalizado na URL", async () => {
		const fetchSpy = mockFetch(200, mockLogs);
		await fetchRoomAccessLogs("room-123", 10);
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("limit=10");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(200, mockLogs);
		await fetchRoomAccessLogs("room-1");
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("lança erro quando resposta não é ok (404)", async () => {
		mockFetch(404, {});
		await expect(fetchRoomAccessLogs("room-ghost")).rejects.toThrow(
			/falha ao carregar logs de acesso da sala/i,
		);
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Network error"));
		await expect(fetchRoomAccessLogs("room-1")).rejects.toThrow("Network error");
	});

	it("retorna lista vazia quando não há logs", async () => {
		mockFetch(200, { logs: [] });
		const result = await fetchRoomAccessLogs("room-new");
		expect(result.logs).toHaveLength(0);
	});
});
