import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

type AdminReply = {
	status: (code: number) => { send: (body: unknown) => void };
};

import { eq } from "drizzle-orm";
import type { SchemaWithExamples } from "@/api/openapi";
import { db } from "@/db";
import { userRoomPermission, userRoomTypePermission } from "@/db/schema/access";
import { profile, userProfile } from "@/db/schema/profile";
import { room, roomType } from "@/db/schema/room";
import { auth } from "@/lib/auth";
import { z } from "@/lib/zod";
import { createUser } from "@/services/user/create-user";
import { deleteUser } from "@/services/user/delete-user";
import { getUsers } from "@/services/user/get-user";
import { updateUser } from "@/services/user/update-user";

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
	reply: AdminReply,
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
	profiles: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
		}),
	),
});

const listUsersResponseSchema = z.object({
	result: z.array(userSummarySchema),
	total: z.number(),
	page: z.number(),
	pageSize: z.number(),
	totalPages: z.number(),
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
			profiles: [{ id: "abc123", name: "Docentes" }],
		},
	],
	total: 1,
	page: 1,
	pageSize: 20,
	totalPages: 1,
};

const userRelationsSchema = z.object({
	profiles: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			description: z.string(),
		}),
	),
	rooms: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			blockId: z.string(),
		}),
	),
	roomTypes: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			abbreviation: z.string(),
		}),
	),
});

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
				return (reply as unknown as AdminReply)
					.status(401)
					.send({ message: "Autenticação necessária." });
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

	// GET /users?q=&profileIds=  (admin only)
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
					profileIds: z
						.string()
						.optional()
						.describe("IDs de perfis separados por vírgula"),
					page: z.coerce.number().int().min(1).optional().default(1),
					pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
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
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;
			const { q, profileIds, page, pageSize } = request.query as {
				q?: string;
				profileIds?: string;
				page?: number;
				pageSize?: number;
			};
			const profileIdsArray = profileIds?.trim()
				? profileIds
						.split(",")
						.map((id) => id.trim())
						.filter(Boolean)
				: undefined;
			const users = await getUsers({
				q,
				profileIds: profileIdsArray,
				page: page ?? 1,
				pageSize: pageSize ?? 20,
			});
			const payload: z.infer<typeof listUsersResponseSchema> = {
				result: users.result.map((user) => ({
					...user,
					createdAt: user.createdAt.toISOString(),
					updatedAt: user.updatedAt.toISOString(),
				})),
				total: users.total,
				page: users.page,
				pageSize: users.pageSize,
				totalPages: users.totalPages,
			};
			return reply.status(200).send(payload);
		},
	);

	// GET /users/:id/relations — perfis, salas e tipos de sala do usuário
	app.get(
		"/:id/relations",
		{
			schema: {
				tags: ["users"],
				summary: "Vínculos do usuário",
				description:
					"Retorna os perfis, salas e tipos de sala associados ao usuário.",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				response: { 200: userRelationsSchema },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;

			const { id: userId } = request.params as { id: string };

			const [profiles, rooms, roomTypes] = await Promise.all([
				// Perfis do usuário
				db
					.select({
						id: profile.id,
						name: profile.name,
						description: profile.description,
					})
					.from(userProfile)
					.innerJoin(profile, eq(userProfile.profileId, profile.id))
					.where(eq(userProfile.userId, userId)),

				// Salas com permissão direta
				db
					.select({
						id: room.id,
						name: room.name,
						blockId: room.blockId,
					})
					.from(userRoomPermission)
					.innerJoin(room, eq(userRoomPermission.roomId, room.id))
					.where(eq(userRoomPermission.userId, userId)),

				// Tipos de sala
				db
					.select({
						id: roomType.id,
						name: roomType.name,
						abbreviation: roomType.abbreviation,
					})
					.from(userRoomTypePermission)
					.innerJoin(
						roomType,
						eq(userRoomTypePermission.roomTypeId, roomType.id),
					)
					.where(eq(userRoomTypePermission.userId, userId)),
			]);

			return reply.status(200).send({ profiles, rooms, roomTypes });
		},
	);

	// POST /users  (admin only)
	app.post(
		"/",
		{
			schema: {
				tags: ["users"],
				summary: "Criar usuário",
				description:
					"Cria um novo usuário no sistema. Opcionalmente vincula perfis, salas e tipos de sala.",
				security: [{ sessionCookie: [] }],
				body: z.object({
					name: z.string().min(2),
					email: z.string().email(),
					isAdmin: z.boolean().default(false),
					password: z.string().min(6).optional(),
					profileIds: z.array(z.string().uuid()).optional(),
					roomIds: z.array(z.string().uuid()).optional(),
					roomTypeIds: z.array(z.string().uuid()).optional(),
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
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;
			const {
				name,
				email,
				isAdmin,
				password,
				profileIds,
				roomIds,
				roomTypeIds,
			} = request.body as {
				name: string;
				email: string;
				isAdmin: boolean;
				password?: string;
				profileIds?: string[];
				roomIds?: string[];
				roomTypeIds?: string[];
			};
			const created = await createUser({
				name,
				email,
				isAdmin,
				password,
				profileIds,
				roomIds,
				roomTypeIds,
			});
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
				description:
					"Atualiza os dados de um usuário e sincroniza perfis, salas e tipos de sala.",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				body: z.object({
					name: z.string().optional(),
					email: z.string().email().optional(),
					isAdmin: z.boolean().optional(),
					profileIds: z.array(z.string().uuid()).optional(),
					roomIds: z.array(z.string().uuid()).optional(),
					roomTypeIds: z.array(z.string().uuid()).optional(),
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
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;
			const { id } = request.params as { id: string };
			const { name, email, isAdmin, profileIds, roomIds, roomTypeIds } =
				request.body as {
					name?: string;
					email?: string;
					isAdmin?: boolean;
					profileIds?: string[];
					roomIds?: string[];
					roomTypeIds?: string[];
				};
			const updated = await updateUser({
				id,
				name,
				email,
				isAdmin,
				profileIds,
				roomIds,
				roomTypeIds,
			});
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
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;
			const { id } = request.params as { id: string };
			await deleteUser(id);
			return reply.status(204).send();
		},
	);
};
