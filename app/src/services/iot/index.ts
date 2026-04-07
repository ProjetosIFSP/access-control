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

export async function deleteController(controllerId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/iot/devices/${controllerId}`, {
        method: "DELETE",
        credentials: "include",
    });
    if (!res.ok) {
        throw new Error("Failed to delete controller");
    }
}

export async function putController({ controllerId, data }: { controllerId: string; data: Record<string, string | undefined> }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/iot/devices/${controllerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        throw new Error("Failed to update controller");
    }
}
