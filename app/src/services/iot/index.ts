import { queryOptions } from "@tanstack/react-query";
import type { ControllersResponse, } from "@/routes/config/-types";

declare const __API_BASE_URL__: string | undefined;
const API_BASE_URL =
(typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : undefined) ??
(typeof import.meta !== "undefined"
? (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
: undefined) ??
"http://localhost:3333";

export const configQueryKeys = {
    controllers: ["iot", "controllers"] as const,
};

export const controllersQueryOptions = queryOptions({
queryKey: configQueryKeys.controllers,
queryFn: async (): Promise<ControllersResponse> => {
const res = await fetch(`${API_BASE_URL}/iot/controllers`, {
credentials: "include",
});
if (!res.ok) throw new Error("Failed to fetch controllers");
return res.json();
},
});
