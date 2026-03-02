import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { SchemaWithExamples } from "@/api/openapi";
import { z } from "@/lib/zod";
import { auth } from "@/lib/auth";
import { getUsers } from "@/services/user/get-user";
import { createUser } from "@/services/user/create-user";
import { updateUser } from "@/services/user/update-user";
import { deleteUser } from "@/services/user/delete-user";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveSession(request: { headers: Record<string, unknown> }) {
	return auth.api
		.getSession({
			headers: new Headers(request.headers as Record<string, string>),
		})
		.catch(() => null);
}

async function requireAdmin(
	request: { headers: Record<string, unknown> },
	reply: { status: (code: number) => { send: (body: unknown) => void } },
) {
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

// ── Schemas ───────────────────────────────────────────────────────────────────

const userSummarySchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email: z.string().email(),
	image: z.string().nullable(),
	isAdmin: z.boolean(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	hasCredentials: z.boolean(),
});

const listUsersResponseSchema = z.object({
	result: z.array(userSummarySchema),
});

const listUsersResponseExample: z.infer<typeof listUsersResponseSchema> = {
	result: [
		{
			id: "7b3cf58e-353f-48de-b2fd-6f203d64d3f8",
			name: "Ana Souza",
			email: "ana.souza@ifsp.edu.br",
			image: null,
			isAdmin: true,
			createdAt: "2025-01-10T13:25:00.000Z",
			updatedAt: "2025-02-11T09:42:00.000Z",
			hasCredentials: true,
		},
	],
};

// ── Route ─────────────────────────────────────────────────────────────────────

export const userRoute: FastifyPluginAsyncZod = async (app) => {
	// GET /users/me — returns current user info (auth required, no admin guard)
	app.get(
		"/me",
		{
			schema: {
				tags: ["users"],
				summary: "Dados do usuário autenticado",
				description:
					"Retorna os dados do usuário logado, incluindo se é administrador.",
				security: [{ sessionCookie: [] }],
				response: {
					200: z.object({
						id: z.string().uuid(),
						name: z.string(),
						email: z.string().email(),
						image: z.string().nullable(),
						isAdmin: z.boolean(),
					}),
				},
			},
		},
		async (request, reply) => {
			const session = await resolveSession(request);
			if (!session?.user) {
				return reply.status(401).send({ message: "Autenticação necessária." });
			}
			const u = session.user as Record<string, unknown>;
			return reply.status(200).send({
				id: u.id as string,
				name: u.name as string,
				email: u.email as string,
				image: (u.image as string) ?? null,
				isAdmin: !!u.isAdmin,
			});
		},
	);

	// GET /users?q=  (admin only)
	app.get(
		"/",
		{
			schema: {
				tags: ["users"],
				summary: "Listar usuários",
				description:
					"Retorna os usuários cadastrados e indica se possuem credencial física associada.",
				security: [{ sessionCookie: [] }],
				querystring: z.object({
					q: z.string().optional(),
				}),
				response: {
					200: listUsersResponseSchema,
				},
				responseExamples: {
					200: listUsersResponseExample,
				},
			} satisfies SchemaWithExamples,
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply))) return;
			const { q } = request.query as { q?: string };
			const users = await getUsers(q);
			const payload: z.infer<typeof listUsersResponseSchema> = {
				result: users.result.map((user) => ({
					...user,
					createdAt: user.createdAt.toISOString(),
					updatedAt: user.updatedAt.toISOString(),
				})),
			};
			return reply.status(200).send(payload);
		},
	);

	// POST /users  (admin only)
	app.post(
		"/",
		{
			schema: {
				tags: ["users"],
				summary: "Criar usuário",
				description: "Cria um novo usuário no sistema.",
				security: [{ sessionCookie: [] }],
				body: z.object({
					name: z.string().min(2),
					email: z.string().email(),
					isAdmin: z.boolean().default(false),
					password: z.string().min(6).optional(),
				}),
				response: {
					201: z.object({
						id: z.string().uuid(),
						name: z.string(),
						email: z.string().email(),
						image: z.string().nullable(),
						isAdmin: z.boolean(),
						createdAt: z.string().datetime(),
						updatedAt: z.string().datetime(),
					}),
				},
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply))) return;
			const body = request.body as {
				name: string;
				email: string;
				isAdmin: boolean;
				password?: string;
			};
			const created = await createUser(body);
			return reply.status(201).send({
				...created,
				createdAt: created.createdAt.toISOString(),
				updatedAt: created.updatedAt.toISOString(),
			});
		},
	);

	// PUT /users/:id  (admin only)
	app.put(
		"/:id",
		{
			schema: {
				tags: ["users"],
				summary: "Atualizar usuário",
				description: "Atualiza os dados de um usuário.",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				body: z.object({
					name: z.string().optional(),
					email: z.string().email().optional(),
					isAdmin: z.boolean().optional(),
				}),
				response: {
					200: z.object({
						id: z.string().uuid(),
						name: z.string(),
						email: z.string().email(),
						image: z.string().nullable(),
						isAdmin: z.boolean(),
						createdAt: z.string().datetime(),
						updatedAt: z.string().datetime(),
					}),
				},
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply))) return;
			const { id } = request.params as { id: string };
			const body = request.body as {
				name?: string;
				email?: string;
				isAdmin?: boolean;
			};
			const updated = await updateUser({ id, ...body });
			return reply.status(200).send({
				...updated,
				createdAt: updated.createdAt.toISOString(),
				updatedAt: updated.updatedAt.toISOString(),
			});
		},
	);

	// DELETE /users/:id  (admin only)
	app.delete(
		"/:id",
		{
			schema: {
				tags: ["users"],
				summary: "Excluir usuário",
				description: "Remove um usuário do sistema.",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				response: {
					204: z.void(),
				},
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply))) return;
			const { id } = request.params as { id: string };
			await deleteUser(id);
			return reply.status(204).send();
		},
	);
};
