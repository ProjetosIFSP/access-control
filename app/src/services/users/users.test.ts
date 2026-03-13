import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type CreateUserPayload,
	type UpdateUserPayload,
	type UserSummary,
	type UsersResponse,
	createUser,
	currentUserQueryOptions,
	deleteUser,
	fetchCurrentUser,
	fetchUserRelations,
	fetchUsers,
	updateUser,
	userRelationsQueryOptions,
	usersQueryKeys,
	usersQueryOptions,
} from "./index";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUser(overrides?: Partial<UserSummary>): UserSummary {
	return {
		id: "user-uuid-001",
		name: "João Silva",
		email: "joao.silva@ifsp.edu.br",
		image: null,
		isAdmin: false,
		createdAt: "2025-01-15T10:00:00.000Z",
		updatedAt: "2025-01-15T10:00:00.000Z",
		hasCredentials: false,
		fingerprintCount: 0,
		profiles: [],
		...overrides,
	};
}

function makeUsersResponse(
	overrides?: Partial<UsersResponse>,
): UsersResponse {
	return {
		result: [makeUser()],
		total: 1,
		page: 1,
		pageSize: 20,
		totalPages: 1,
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

// ── usersQueryKeys ────────────────────────────────────────────────────────────

describe("usersQueryKeys", () => {
	it("all retorna array estável ['users']", () => {
		expect(usersQueryKeys.all).toEqual(["users"]);
	});

	it("me retorna array estável ['users', 'me']", () => {
		expect(usersQueryKeys.me).toEqual(["users", "me"]);
	});

	it("list retorna array com filtros embutidos", () => {
		const key = usersQueryKeys.list({ q: "João", page: 1 });
		expect(key).toContain("users");
		expect(key).toContain("list");
	});

	it("list retorna chaves diferentes para filtros distintos", () => {
		const key1 = usersQueryKeys.list({ q: "Maria" });
		const key2 = usersQueryKeys.list({ q: "José" });
		expect(key1).not.toEqual(key2);
	});

	it("list retorna chaves iguais para filtros idênticos", () => {
		const key1 = usersQueryKeys.list({ q: "test", page: 2 });
		const key2 = usersQueryKeys.list({ q: "test", page: 2 });
		expect(key1).toEqual(key2);
	});

	it("list sem filtros retorna array com pelo menos 2 elementos", () => {
		const key = usersQueryKeys.list({});
		expect(Array.isArray(key)).toBe(true);
		expect(key.length).toBeGreaterThanOrEqual(2);
	});

	it("relations retorna array contendo o id do usuário", () => {
		const key = usersQueryKeys.relations("user-123");
		expect(key).toContain("user-123");
	});

	it("relations retorna chaves diferentes para ids distintos", () => {
		const key1 = usersQueryKeys.relations("user-aaa");
		const key2 = usersQueryKeys.relations("user-bbb");
		expect(key1).not.toEqual(key2);
	});
});

// ── usersQueryOptions ─────────────────────────────────────────────────────────

describe("usersQueryOptions", () => {
	it("queryKey inclui os filtros fornecidos", () => {
		const opts = usersQueryOptions({ q: "Maria", page: 2 });
		expect(opts.queryKey).toContain("list");
	});

	it("queryKey é estável para os mesmos filtros", () => {
		const opts1 = usersQueryOptions({ page: 1 });
		const opts2 = usersQueryOptions({ page: 1 });
		expect(opts1.queryKey).toEqual(opts2.queryKey);
	});

	it("staleTime é maior que 0", () => {
		const opts = usersQueryOptions({});
		expect(opts.staleTime).toBeGreaterThan(0);
	});

	it("queryFn é uma função", () => {
		const opts = usersQueryOptions({});
		expect(typeof opts.queryFn).toBe("function");
	});
});

// ── currentUserQueryOptions ───────────────────────────────────────────────────

describe("currentUserQueryOptions", () => {
	it("queryKey é ['users', 'me']", () => {
		expect(currentUserQueryOptions.queryKey).toEqual(["users", "me"]);
	});

	it("staleTime é 5 minutos (300000ms)", () => {
		expect(currentUserQueryOptions.staleTime).toBe(1000 * 60 * 5);
	});

	it("retry é false", () => {
		expect(currentUserQueryOptions.retry).toBe(false);
	});

	it("queryFn é uma função", () => {
		expect(typeof currentUserQueryOptions.queryFn).toBe("function");
	});
});

// ── userRelationsQueryOptions ─────────────────────────────────────────────────

describe("userRelationsQueryOptions", () => {
	it("enabled é false quando id é null", () => {
		const opts = userRelationsQueryOptions(null);
		expect(opts.enabled).toBe(false);
	});

	it("enabled é true quando id é string válida", () => {
		const opts = userRelationsQueryOptions("user-123");
		expect(opts.enabled).toBe(true);
	});

	it("queryKey contém o id quando fornecido", () => {
		const opts = userRelationsQueryOptions("user-abc");
		expect(opts.queryKey).toContain("user-abc");
	});

	it("staleTime é maior que 0", () => {
		const opts = userRelationsQueryOptions("user-1");
		expect(opts.staleTime).toBeGreaterThan(0);
	});
});

// ── fetchCurrentUser ──────────────────────────────────────────────────────────

describe("fetchCurrentUser", () => {
	it("retorna dados do usuário atual em caso de sucesso", async () => {
		mockFetch(200, { isAdmin: false });
		const result = await fetchCurrentUser();
		expect(result).toEqual({ isAdmin: false });
	});

	it("retorna isAdmin: true para administrador", async () => {
		mockFetch(200, { isAdmin: true });
		const result = await fetchCurrentUser();
		expect(result.isAdmin).toBe(true);
	});

	it("chama o endpoint /users/me", async () => {
		const fetchSpy = mockFetch(200, { isAdmin: false });
		await fetchCurrentUser();
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/users/me");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(200, { isAdmin: false });
		await fetchCurrentUser();
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("lança erro quando resposta não é ok (401)", async () => {
		mockFetch(401, {});
		await expect(fetchCurrentUser()).rejects.toThrow(
			/falha ao obter usuário atual/i,
		);
	});

	it("lança erro quando resposta não é ok (403)", async () => {
		mockFetch(403, {});
		await expect(fetchCurrentUser()).rejects.toThrow();
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Network error"));
		await expect(fetchCurrentUser()).rejects.toThrow("Network error");
	});
});

// ── fetchUsers ────────────────────────────────────────────────────────────────

describe("fetchUsers", () => {
	it("retorna lista de usuários em caso de sucesso", async () => {
		const data = makeUsersResponse();
		mockFetch(200, data);
		const result = await fetchUsers({});
		expect(result).toEqual(data);
	});

	it("chama o endpoint /users", async () => {
		const fetchSpy = mockFetch(200, makeUsersResponse());
		await fetchUsers({});
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/users");
	});

	it("adiciona parâmetro q na URL quando fornecido", async () => {
		const fetchSpy = mockFetch(200, makeUsersResponse());
		await fetchUsers({ q: "Maria" });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("q=Maria");
	});

	it("não adiciona parâmetro q quando vazio", async () => {
		const fetchSpy = mockFetch(200, makeUsersResponse());
		await fetchUsers({ q: "" });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).not.toContain("q=");
	});

	it("não adiciona parâmetro q quando apenas espaços", async () => {
		const fetchSpy = mockFetch(200, makeUsersResponse());
		await fetchUsers({ q: "   " });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).not.toContain("q=");
	});

	it("adiciona profileIds na URL quando fornecido", async () => {
		const fetchSpy = mockFetch(200, makeUsersResponse());
		await fetchUsers({ profileIds: ["p1", "p2"] });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("profileIds=p1%2Cp2");
	});

	it("não adiciona profileIds na URL quando array vazio", async () => {
		const fetchSpy = mockFetch(200, makeUsersResponse());
		await fetchUsers({ profileIds: [] });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).not.toContain("profileIds");
	});

	it("adiciona page na URL quando fornecido", async () => {
		const fetchSpy = mockFetch(200, makeUsersResponse());
		await fetchUsers({ page: 3 });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("page=3");
	});

	it("adiciona pageSize na URL quando fornecido", async () => {
		const fetchSpy = mockFetch(200, makeUsersResponse());
		await fetchUsers({ pageSize: 50 });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("pageSize=50");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(200, makeUsersResponse());
		await fetchUsers({});
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("lança erro quando resposta não é ok (500)", async () => {
		mockFetch(500, {});
		await expect(fetchUsers({})).rejects.toThrow(/falha ao carregar os usuários/i);
	});

	it("retorna lista vazia quando não há usuários", async () => {
		mockFetch(200, makeUsersResponse({ result: [], total: 0, totalPages: 0 }));
		const result = await fetchUsers({});
		expect(result.result).toHaveLength(0);
	});

	it("retorna paginação correta", async () => {
		const data = makeUsersResponse({ page: 2, pageSize: 10, total: 100, totalPages: 10 });
		mockFetch(200, data);
		const result = await fetchUsers({ page: 2, pageSize: 10 });
		expect(result.page).toBe(2);
		expect(result.pageSize).toBe(10);
		expect(result.total).toBe(100);
		expect(result.totalPages).toBe(10);
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Connection refused"));
		await expect(fetchUsers({})).rejects.toThrow("Connection refused");
	});
});

// ── createUser ────────────────────────────────────────────────────────────────

describe("createUser", () => {
	const payload: CreateUserPayload = {
		name: "Maria Souza",
		email: "maria.souza@ifsp.edu.br",
		isAdmin: false,
	};

	it("retorna o usuário criado em caso de sucesso", async () => {
		const created = makeUser({ name: "Maria Souza", email: "maria.souza@ifsp.edu.br" });
		mockFetch(201, created);
		const result = await createUser(payload);
		expect(result).toEqual(created);
	});

	it("chama o endpoint /users", async () => {
		const fetchSpy = mockFetch(201, makeUser());
		await createUser(payload);
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/users");
		expect(url).not.toContain("/users/");
	});

	it("usa método POST", async () => {
		const fetchSpy = mockFetch(201, makeUser());
		await createUser(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.method).toBe("POST");
	});

	it("envia Content-Type: application/json", async () => {
		const fetchSpy = mockFetch(201, makeUser());
		await createUser(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const headers = options?.headers as Record<string, string>;
		expect(headers?.["Content-Type"]).toBe("application/json");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(201, makeUser());
		await createUser(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("serializa o payload corretamente no body", async () => {
		const fetchSpy = mockFetch(201, makeUser());
		await createUser(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body).toMatchObject({
			name: "Maria Souza",
			email: "maria.souza@ifsp.edu.br",
			isAdmin: false,
		});
	});

	it("inclui profileIds no body quando fornecido", async () => {
		const fetchSpy = mockFetch(201, makeUser());
		await createUser({ ...payload, profileIds: ["p1", "p2"] });
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.profileIds).toEqual(["p1", "p2"]);
	});

	it("inclui password no body quando fornecido", async () => {
		const fetchSpy = mockFetch(201, makeUser());
		await createUser({ ...payload, password: "senhaSegura123" });
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.password).toBe("senhaSegura123");
	});

	it("cria usuário admin corretamente", async () => {
		const adminUser = makeUser({ isAdmin: true });
		mockFetch(201, adminUser);
		const result = await createUser({ ...payload, isAdmin: true });
		expect(result.isAdmin).toBe(true);
	});

	it("lança erro com mensagem do servidor em caso de conflito (409)", async () => {
		mockFetch(409, { message: "E-mail já cadastrado no sistema" });
		await expect(createUser(payload)).rejects.toThrow(/E-mail já cadastrado/i);
	});

	it("lança erro com mensagem genérica quando body não tem message", async () => {
		mockFetch(409, {});
		await expect(createUser(payload)).rejects.toThrow(/falha ao criar usuário/i);
	});

	it("lança erro em caso de 500", async () => {
		mockFetch(500, { message: "Erro interno do servidor" });
		await expect(createUser(payload)).rejects.toThrow("Erro interno do servidor");
	});

	it("lança erro em caso de 401", async () => {
		mockFetch(401, { message: "Autenticação necessária" });
		await expect(createUser(payload)).rejects.toThrow();
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Network failure"));
		await expect(createUser(payload)).rejects.toThrow("Network failure");
	});
});

// ── updateUser ────────────────────────────────────────────────────────────────

describe("updateUser", () => {
	const payload: UpdateUserPayload = {
		id: "user-abc",
		name: "João Silva Atualizado",
		email: "joao.novo@ifsp.edu.br",
		isAdmin: false,
	};

	it("retorna o usuário atualizado em caso de sucesso", async () => {
		const updated = makeUser({ name: "João Silva Atualizado" });
		mockFetch(200, updated);
		const result = await updateUser(payload);
		expect(result).toEqual(updated);
	});

	it("chama o endpoint /users/:id com o ID correto", async () => {
		const fetchSpy = mockFetch(200, makeUser());
		await updateUser(payload);
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/users/user-abc");
	});

	it("usa método PUT", async () => {
		const fetchSpy = mockFetch(200, makeUser());
		await updateUser(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.method).toBe("PUT");
	});

	it("envia Content-Type: application/json", async () => {
		const fetchSpy = mockFetch(200, makeUser());
		await updateUser(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const headers = options?.headers as Record<string, string>;
		expect(headers?.["Content-Type"]).toBe("application/json");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(200, makeUser());
		await updateUser(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("não inclui o id no body da requisição", async () => {
		const fetchSpy = mockFetch(200, makeUser());
		await updateUser(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body).not.toHaveProperty("id");
	});

	it("serializa name e email corretamente no body", async () => {
		const fetchSpy = mockFetch(200, makeUser());
		await updateUser(payload);
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.name).toBe("João Silva Atualizado");
		expect(body.email).toBe("joao.novo@ifsp.edu.br");
	});

	it("inclui profileIds no body quando fornecido", async () => {
		const fetchSpy = mockFetch(200, makeUser());
		await updateUser({ ...payload, profileIds: ["p1"] });
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options?.body as string);
		expect(body.profileIds).toEqual(["p1"]);
	});

	it("promove usuário a admin corretamente", async () => {
		const adminUser = makeUser({ isAdmin: true });
		mockFetch(200, adminUser);
		const result = await updateUser({ ...payload, isAdmin: true });
		expect(result.isAdmin).toBe(true);
	});

	it("lança erro com mensagem do servidor em caso de 404", async () => {
		mockFetch(404, { message: "Usuário não encontrado" });
		await expect(updateUser(payload)).rejects.toThrow(/Usuário não encontrado/i);
	});

	it("lança erro com mensagem genérica quando body não tem message", async () => {
		mockFetch(500, {});
		await expect(updateUser(payload)).rejects.toThrow(/falha ao atualizar usuário/i);
	});

	it("lança erro em caso de 401", async () => {
		mockFetch(401, { message: "Não autenticado" });
		await expect(updateUser(payload)).rejects.toThrow();
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Timeout"));
		await expect(updateUser(payload)).rejects.toThrow("Timeout");
	});

	it("usa IDs diferentes para diferentes usuários na URL", async () => {
		const fetchSpy = mockFetch(200, makeUser());
		await updateUser({ ...payload, id: "outro-user-xyz" });
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/users/outro-user-xyz");
	});
});

// ── deleteUser ────────────────────────────────────────────────────────────────

describe("deleteUser", () => {
	it("resolve sem retorno em caso de sucesso (204)", async () => {
		const response = {
			ok: true,
			status: 204,
			json: vi.fn().mockRejectedValue(new Error("No body")),
		} as unknown as Response;
		vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

		await expect(deleteUser("user-123")).resolves.toBeUndefined();
	});

	it("chama o endpoint /users/:id com o ID correto", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteUser("user-to-delete");
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/users/user-to-delete");
	});

	it("usa método DELETE", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteUser("user-123");
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.method).toBe("DELETE");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteUser("user-123");
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("lança erro com mensagem do servidor quando não encontrado (404)", async () => {
		mockFetch(404, { message: "Usuário não encontrado" });
		await expect(deleteUser("user-ghost")).rejects.toThrow(/Usuário não encontrado/i);
	});

	it("lança erro com mensagem genérica quando body não tem message", async () => {
		mockFetch(404, {});
		await expect(deleteUser("user-123")).rejects.toThrow(/falha ao excluir usuário/i);
	});

	it("lança erro em caso de 403 (sem permissão)", async () => {
		mockFetch(403, { message: "Sem permissão para excluir este usuário" });
		await expect(deleteUser("user-123")).rejects.toThrow(/Sem permissão/i);
	});

	it("lança erro em caso de 500", async () => {
		mockFetch(500, { message: "Erro interno do servidor" });
		await expect(deleteUser("user-123")).rejects.toThrow("Erro interno do servidor");
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Connection refused"));
		await expect(deleteUser("user-123")).rejects.toThrow("Connection refused");
	});

	it("o ID aparece corretamente no endpoint para diferentes usuários", async () => {
		const fetchSpy = mockFetch(204, null);
		await deleteUser("specific-uuid-789");
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("specific-uuid-789");
	});
});

// ── fetchUserRelations ────────────────────────────────────────────────────────

describe("fetchUserRelations", () => {
	const mockRelations = {
		profiles: [{ id: "p1", name: "Docente", description: "Professor" }],
		rooms: [{ id: "r1", name: "Sala 01", blockId: "b1" }],
		roomTypes: [{ id: "rt1", name: "Laboratório", abbreviation: "LAB" }],
	};

	it("retorna os vínculos do usuário em caso de sucesso", async () => {
		mockFetch(200, mockRelations);
		const result = await fetchUserRelations("user-123");
		expect(result).toEqual(mockRelations);
	});

	it("chama o endpoint /users/:id/relations com o ID correto", async () => {
		const fetchSpy = mockFetch(200, mockRelations);
		await fetchUserRelations("user-abc");
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
		expect(url).toContain("/users/user-abc/relations");
	});

	it("usa credentials: include", async () => {
		const fetchSpy = mockFetch(200, mockRelations);
		await fetchUserRelations("user-1");
		const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(options?.credentials).toBe("include");
	});

	it("lança erro quando resposta não é ok (404)", async () => {
		mockFetch(404, {});
		await expect(fetchUserRelations("user-ghost")).rejects.toThrow(
			/falha ao carregar vínculos do usuário/i,
		);
	});

	it("lança erro quando resposta não é ok (500)", async () => {
		mockFetch(500, {});
		await expect(fetchUserRelations("user-1")).rejects.toThrow();
	});

	it("propaga erro de rede", async () => {
		mockFetchThrow(new Error("Network error"));
		await expect(fetchUserRelations("user-1")).rejects.toThrow("Network error");
	});

	it("retorna vínculos vazios quando usuário não tem relações", async () => {
		const empty = { profiles: [], rooms: [], roomTypes: [] };
		mockFetch(200, empty);
		const result = await fetchUserRelations("user-new");
		expect(result.profiles).toHaveLength(0);
		expect(result.rooms).toHaveLength(0);
		expect(result.roomTypes).toHaveLength(0);
	});
});
