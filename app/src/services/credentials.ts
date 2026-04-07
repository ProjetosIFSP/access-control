import { queryOptions } from "@tanstack/react-query";

const API_BASE_URL =
(typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_API_URL : undefined) ??
"http://localhost:3333";

export type NfcCredentialSummary = {
id: string;
value: string;
isActive: boolean;
createdAt: string;
user: { id: string; name: string } | null;
lastUsage: string | null;
};

export type NfcCredentialsResponse = {
result: NfcCredentialSummary[];
total: number;
page: number;
pageSize: number;
totalPages: number;
};

export const credentialsQueryKeys = {
all: ["credentials"] as const,
nfc: (params: { q?: string; page?: number }) => [...credentialsQueryKeys.all, "nfc", params] as const,
};

export async function fetchNfcCredentials(params: {
q?: string | null;
page?: number | null;
}): Promise<NfcCredentialsResponse> {
const url = new URL(`${API_BASE_URL}/credentials/nfc`);
if (params.q) url.searchParams.set("q", params.q);
if (params.page) url.searchParams.set("page", params.page.toString());

const res = await fetch(url.toString(), {
credentials: "include",
});

if (!res.ok) throw new Error("Erro ao buscar credenciais NFC");
return res.json();
}

export const nfcCredentialsQueryOptions = (params: { q?: string | null; page?: number | null }) =>
queryOptions({
queryKey: credentialsQueryKeys.nfc(params),
queryFn: () => fetchNfcCredentials(params),
placeholderData: (prev) => prev,
});

export async function deleteNfcCredential(id: string): Promise<void> {
const res = await fetch(`${API_BASE_URL}/credentials/nfc/${id}`, {
method: "DELETE",
credentials: "include",
});

if (!res.ok) throw new Error("Erro ao remover credencial NFC");
}
