import { auth } from "@/lib/auth";

export type GuardReply = {
	status: (code: number) => { send: (body: unknown) => void };
};

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function resolveSession(request: {
	headers: Record<string, unknown>;
}): Promise<Session> {
	return auth.api
		.getSession({
			headers: new Headers(request.headers as Record<string, string>),
		})
		.catch(() => null);
}

export async function requireAdmin(
	request: { headers: Record<string, unknown> },
	reply: GuardReply,
): Promise<Session | null> {
	const session = await resolveSession(request);

	if (!session?.user) {
		reply.status(401).send({ message: "Autenticação necessária." });
		return null;
	}

	const isAdmin = !!(session.user as Record<string, unknown>).isAdmin;
	if (!isAdmin) {
		reply.status(403).send({ message: "Acesso restrito a administradores." });
		return null;
	}

	return session;
}
