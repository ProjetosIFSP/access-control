import { createAuthClient } from "better-auth/react";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  basePath: "/auth",
});

export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
