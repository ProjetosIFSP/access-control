import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchUserFingerprints,
  registerFingerprint,
  deleteFingerprint,
  toggleFingerprint,
  fingerprintQueryKeys,
  userFingerprintsQueryOptions,
  type FingerprintSummary,
  type RegisterFingerprintPayload,
  type DeleteFingerprintPayload,
  type ToggleFingerprintPayload,
} from "./fingerprints";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSummary(
  overrides?: Partial<FingerprintSummary>,
): FingerprintSummary {
  return {
    id: "fp-uuid-001",
    finger: "right_index",
    isActive: true,
    createdAt: "2025-01-15T10:00:00.000Z",
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

// ── fingerprintQueryKeys ──────────────────────────────────────────────────────

describe("fingerprintQueryKeys", () => {
  it("list retorna array estável para o mesmo userId", () => {
    const key1 = fingerprintQueryKeys.list("user-123");
    const key2 = fingerprintQueryKeys.list("user-123");
    expect(key1).toEqual(key2);
  });

  it("list retorna arrays diferentes para userIds distintos", () => {
    const key1 = fingerprintQueryKeys.list("user-aaa");
    const key2 = fingerprintQueryKeys.list("user-bbb");
    expect(key1).not.toEqual(key2);
  });

  it("list inclui o userId na key", () => {
    const key = fingerprintQueryKeys.list("my-user-id");
    expect(key).toContain("my-user-id");
  });

  it("list retorna um array com pelo menos 2 elementos", () => {
    const key = fingerprintQueryKeys.list("x");
    expect(Array.isArray(key)).toBe(true);
    expect(key.length).toBeGreaterThanOrEqual(2);
  });
});

// ── userFingerprintsQueryOptions ──────────────────────────────────────────────

describe("userFingerprintsQueryOptions", () => {
  it("enabled é false quando userId é null", () => {
    const opts = userFingerprintsQueryOptions(null);
    expect(opts.enabled).toBe(false);
  });

  it("enabled é false quando userId é string vazia", () => {
    const opts = userFingerprintsQueryOptions("");
    expect(opts.enabled).toBe(false);
  });

  it("enabled é true quando userId é string válida", () => {
    const opts = userFingerprintsQueryOptions("user-123");
    expect(opts.enabled).toBe(true);
  });

  it("queryKey contém o userId quando fornecido", () => {
    const opts = userFingerprintsQueryOptions("user-abc");
    expect(opts.queryKey).toContain("user-abc");
  });

  it("queryKey não muda entre chamadas com o mesmo userId", () => {
    const opts1 = userFingerprintsQueryOptions("stable-user");
    const opts2 = userFingerprintsQueryOptions("stable-user");
    expect(opts1.queryKey).toEqual(opts2.queryKey);
  });

  it("staleTime é maior que 0", () => {
    const opts = userFingerprintsQueryOptions("user-1");
    expect(opts.staleTime).toBeGreaterThan(0);
  });

  it("queryFn é uma função", () => {
    const opts = userFingerprintsQueryOptions("user-1");
    expect(typeof opts.queryFn).toBe("function");
  });
});

// ── fetchUserFingerprints ─────────────────────────────────────────────────────

describe("fetchUserFingerprints", () => {
  it("retorna lista de digitais em caso de sucesso", async () => {
    const data: FingerprintSummary[] = [
      makeSummary({ id: "fp-1", finger: "right_thumb" }),
      makeSummary({ id: "fp-2", finger: "left_index" }),
    ];
    mockFetch(200, data);

    const result = await fetchUserFingerprints("user-xyz");

    expect(result).toEqual(data);
  });

  it("chama o endpoint correto com o userId", async () => {
    const fetchSpy = mockFetch(200, []);

    await fetchUserFingerprints("my-user-123");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
    expect(url).toContain("/users/my-user-123/fingerprints");
  });

  it("usa credentials: include na requisição", async () => {
    const fetchSpy = mockFetch(200, []);

    await fetchUserFingerprints("user-1");

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options?.credentials).toBe("include");
  });

  it("lança erro quando a resposta não é ok (401)", async () => {
    mockFetch(401, { message: "Não autenticado" });

    await expect(fetchUserFingerprints("user-1")).rejects.toThrow();
  });

  it("lança erro quando a resposta não é ok (403)", async () => {
    mockFetch(403, { message: "Acesso negado" });

    await expect(fetchUserFingerprints("user-1")).rejects.toThrow();
  });

  it("lança erro quando a resposta não é ok (500)", async () => {
    mockFetch(500, { message: "Erro interno" });

    await expect(fetchUserFingerprints("user-1")).rejects.toThrow();
  });

  it("lança erro com mensagem específica em caso de falha", async () => {
    mockFetch(500, {});

    await expect(fetchUserFingerprints("user-1")).rejects.toThrow(
      /falha ao carregar/i,
    );
  });

  it("retorna lista vazia quando não há digitais", async () => {
    mockFetch(200, []);

    const result = await fetchUserFingerprints("user-empty");

    expect(result).toEqual([]);
  });

  it("retorna lista com uma digital", async () => {
    const fp = makeSummary();
    mockFetch(200, [fp]);

    const result = await fetchUserFingerprints("user-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(fp);
  });

  it("propaga erro de rede (fetch rejeita)", async () => {
    mockFetchThrow(new Error("Network error"));

    await expect(fetchUserFingerprints("user-1")).rejects.toThrow(
      "Network error",
    );
  });
});

// ── registerFingerprint ───────────────────────────────────────────────────────

describe("registerFingerprint", () => {
  const payload: RegisterFingerprintPayload = {
    userId: "user-abc",
    finger: "right_index",
    template: "TEMPLATE_HEX_STRING",
  };

  it("retorna o FingerprintSummary criado em caso de sucesso", async () => {
    const created = makeSummary({ finger: "right_index" });
    mockFetch(201, created);

    const result = await registerFingerprint(payload);

    expect(result).toEqual(created);
  });

  it("chama o endpoint correto com o userId", async () => {
    const fetchSpy = mockFetch(201, makeSummary());

    await registerFingerprint(payload);

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
    expect(url).toContain("/users/user-abc/fingerprints");
  });

  it("usa método POST", async () => {
    const fetchSpy = mockFetch(201, makeSummary());

    await registerFingerprint(payload);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options?.method).toBe("POST");
  });

  it("envia Content-Type: application/json", async () => {
    const fetchSpy = mockFetch(201, makeSummary());

    await registerFingerprint(payload);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = options?.headers as Record<string, string>;
    expect(headers?.["Content-Type"]).toBe("application/json");
  });

  it("usa credentials: include", async () => {
    const fetchSpy = mockFetch(201, makeSummary());

    await registerFingerprint(payload);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options?.credentials).toBe("include");
  });

  it("envia finger e template no body (sem userId)", async () => {
    const fetchSpy = mockFetch(201, makeSummary());

    await registerFingerprint(payload);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options?.body as string);

    expect(body).toHaveProperty("finger", "right_index");
    expect(body).toHaveProperty("template", "TEMPLATE_HEX_STRING");
    expect(body).not.toHaveProperty("userId");
  });

  it("lança erro com mensagem do servidor em caso de conflito (409)", async () => {
    mockFetch(409, {
      message: "Já existe uma digital cadastrada para o dedo right_index",
    });

    await expect(registerFingerprint(payload)).rejects.toThrow(
      /Já existe uma digital/i,
    );
  });

  it("lança erro com mensagem genérica quando body não tem message", async () => {
    mockFetch(409, {});

    await expect(registerFingerprint(payload)).rejects.toThrow(
      /falha ao cadastrar/i,
    );
  });

  it("lança erro em caso de 500", async () => {
    mockFetch(500, { message: "Erro interno" });

    await expect(registerFingerprint(payload)).rejects.toThrow("Erro interno");
  });

  it("lança erro em caso de 401", async () => {
    mockFetch(401, { message: "Autenticação necessária." });

    await expect(registerFingerprint(payload)).rejects.toThrow();
  });

  it("propaga erro de rede", async () => {
    mockFetchThrow(new Error("Network failure"));

    await expect(registerFingerprint(payload)).rejects.toThrow(
      "Network failure",
    );
  });

  it("funciona para diferentes dedos", async () => {
    const fingers = ["right_thumb", "right_middle", "left_pinky"] as const;

    for (const finger of fingers) {
      mockFetch(201, makeSummary({ finger }));
      const result = await registerFingerprint({ ...payload, finger });
      expect(result).toBeDefined();
      vi.restoreAllMocks();
    }
  });
});

// ── deleteFingerprint ─────────────────────────────────────────────────────────

describe("deleteFingerprint", () => {
  const payload: DeleteFingerprintPayload = {
    userId: "user-abc",
    credentialId: "cred-123",
  };

  it("resolve sem retorno em caso de sucesso (204)", async () => {
    const response = {
      ok: true,
      status: 204,
      json: vi.fn().mockRejectedValue(new Error("No body")),
    } as unknown as Response;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    await expect(deleteFingerprint(payload)).resolves.toBeUndefined();
  });

  it("chama o endpoint correto com userId e credentialId", async () => {
    const fetchSpy = mockFetch(204, null);

    await deleteFingerprint(payload);

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
    expect(url).toContain("/users/user-abc/fingerprints/cred-123");
  });

  it("usa método DELETE", async () => {
    const fetchSpy = mockFetch(204, null);

    await deleteFingerprint(payload);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options?.method).toBe("DELETE");
  });

  it("usa credentials: include", async () => {
    const fetchSpy = mockFetch(204, null);

    await deleteFingerprint(payload);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options?.credentials).toBe("include");
  });

  it("lança erro com mensagem do servidor quando não encontrado (404)", async () => {
    mockFetch(404, {
      message: "Digital não encontrada ou não pertence a este usuário.",
    });

    await expect(deleteFingerprint(payload)).rejects.toThrow(
      /Digital não encontrada/i,
    );
  });

  it("lança erro com mensagem genérica quando body não tem message", async () => {
    mockFetch(404, {});

    await expect(deleteFingerprint(payload)).rejects.toThrow(
      /falha ao remover/i,
    );
  });

  it("lança erro em caso de 500", async () => {
    mockFetch(500, { message: "Erro interno do servidor" });

    await expect(deleteFingerprint(payload)).rejects.toThrow(
      "Erro interno do servidor",
    );
  });

  it("lança erro em caso de 401", async () => {
    mockFetch(401, { message: "Autenticação necessária." });

    await expect(deleteFingerprint(payload)).rejects.toThrow();
  });

  it("propaga erro de rede", async () => {
    mockFetchThrow(new Error("Connection refused"));

    await expect(deleteFingerprint(payload)).rejects.toThrow(
      "Connection refused",
    );
  });

  it("endpoint inclui o credentialId correto na URL", async () => {
    const fetchSpy = mockFetch(204, null);

    await deleteFingerprint({
      userId: "u1",
      credentialId: "specific-cred-id-xyz",
    });

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
    expect(url).toContain("specific-cred-id-xyz");
  });
});

// ── toggleFingerprint ─────────────────────────────────────────────────────────

describe("toggleFingerprint", () => {
  const payload: ToggleFingerprintPayload = {
    userId: "user-abc",
    credentialId: "cred-123",
    isActive: false,
  };

  it("retorna o FingerprintSummary atualizado em caso de sucesso", async () => {
    const updated = makeSummary({ isActive: false });
    mockFetch(200, updated);

    const result = await toggleFingerprint(payload);

    expect(result).toEqual(updated);
  });

  it("chama o endpoint correto com userId e credentialId", async () => {
    const fetchSpy = mockFetch(200, makeSummary());

    await toggleFingerprint(payload);

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit?];
    expect(url).toContain("/users/user-abc/fingerprints/cred-123");
  });

  it("usa método PATCH", async () => {
    const fetchSpy = mockFetch(200, makeSummary());

    await toggleFingerprint(payload);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options?.method).toBe("PATCH");
  });

  it("envia Content-Type: application/json", async () => {
    const fetchSpy = mockFetch(200, makeSummary());

    await toggleFingerprint(payload);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = options?.headers as Record<string, string>;
    expect(headers?.["Content-Type"]).toBe("application/json");
  });

  it("usa credentials: include", async () => {
    const fetchSpy = mockFetch(200, makeSummary());

    await toggleFingerprint(payload);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options?.credentials).toBe("include");
  });

  it("envia isActive no body quando desativando", async () => {
    const fetchSpy = mockFetch(200, makeSummary({ isActive: false }));

    await toggleFingerprint({ ...payload, isActive: false });

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options?.body as string);

    expect(body).toEqual({ isActive: false });
  });

  it("envia isActive no body quando ativando", async () => {
    const fetchSpy = mockFetch(200, makeSummary({ isActive: true }));

    await toggleFingerprint({ ...payload, isActive: true });

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options?.body as string);

    expect(body).toEqual({ isActive: true });
  });

  it("lança erro com mensagem do servidor quando não encontrado (404)", async () => {
    mockFetch(404, {
      message: "Digital não encontrada ou não pertence a este usuário.",
    });

    await expect(toggleFingerprint(payload)).rejects.toThrow(
      /Digital não encontrada/i,
    );
  });

  it("lança erro com mensagem genérica quando body não tem message", async () => {
    mockFetch(404, {});

    await expect(toggleFingerprint(payload)).rejects.toThrow(
      /falha ao alterar o status/i,
    );
  });

  it("lança erro em caso de 500", async () => {
    mockFetch(500, { message: "Erro inesperado" });

    await expect(toggleFingerprint(payload)).rejects.toThrow("Erro inesperado");
  });

  it("lança erro em caso de 401", async () => {
    mockFetch(401, { message: "Autenticação necessária." });

    await expect(toggleFingerprint(payload)).rejects.toThrow();
  });

  it("propaga erro de rede", async () => {
    mockFetchThrow(new Error("Timeout"));

    await expect(toggleFingerprint(payload)).rejects.toThrow("Timeout");
  });

  it("retorna o FingerprintSummary com isActive=true quando reativando", async () => {
    const updated = makeSummary({ isActive: true });
    mockFetch(200, updated);

    const result = await toggleFingerprint({ ...payload, isActive: true });

    expect(result.isActive).toBe(true);
  });
});

// ── Integração entre funções ──────────────────────────────────────────────────

describe("integração — fluxo de registro e listagem", () => {
  it("a key de query da lista muda corretamente entre dois usuários", () => {
    const keyA = fingerprintQueryKeys.list("user-A");
    const keyB = fingerprintQueryKeys.list("user-B");

    expect(keyA).not.toEqual(keyB);
    expect(keyA).toContain("user-A");
    expect(keyB).toContain("user-B");
  });

  it("queryOptions para userId válido tem enabled=true e queryFn executável", async () => {
    const fp = makeSummary();
    mockFetch(200, [fp]);

    const opts = userFingerprintsQueryOptions("user-valid");

    expect(opts.enabled).toBe(true);

    // Simula chamada da queryFn (como o TanStack Query faria)
    const queryFn = opts.queryFn as () => Promise<FingerprintSummary[]>;
    const result = await queryFn();

    expect(result).toEqual([fp]);
  });
});
