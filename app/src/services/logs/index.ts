import { queryOptions } from "@tanstack/react-query";
import type { GetLogs200, GetLogsParams } from "@/lib/api/generated";

declare const __API_BASE_URL__: string | undefined;
const API_BASE_URL =
	(typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : undefined) ??
	(typeof import.meta !== "undefined"
		? (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
		: undefined) ??
	"http://localhost:3333";

export async function fetchLogs(params: GetLogsParams): Promise<GetLogs200> {
	const url = new URL(`${API_BASE_URL}/logs`);
	if (params.q?.trim()) url.searchParams.set("q", params.q.trim());
	if (params.roomId) url.searchParams.set("roomId", params.roomId);
	if (params.userId) url.searchParams.set("userId", params.userId);
	if (params.status) url.searchParams.set("status", params.status);
	if (params.from) url.searchParams.set("from", params.from);
	if (params.to) url.searchParams.set("to", params.to);
	if (params.page) url.searchParams.set("page", String(params.page));
	if (params.pageSize)
		url.searchParams.set("pageSize", String(params.pageSize));

	const res = await fetch(url.toString(), { credentials: "include" });
	if (!res.ok) throw new Error("Falha ao carregar os logs");
	return res.json();
}

export const logsQueryKeys = {
	all: ["logs"] as const,
	list: (params: GetLogsParams) => [...logsQueryKeys.all, params] as const,
};

export function logsQueryOptions(params: GetLogsParams) {
	return queryOptions({
		queryKey: logsQueryKeys.list(params),
		queryFn: () => fetchLogs(params),
	});
}
