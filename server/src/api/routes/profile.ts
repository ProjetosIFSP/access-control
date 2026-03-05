import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

type AdminReply = {
	status: (code: number) => { send: (body: unknown) => void };
};

import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import {
	profileRoomPermission,
	profileRoomTypePermission,
	userProfile,
} from "@/db/schema/profile";
import { room, roomType } from "@/db/schema/room";
import { auth } from "@/lib/auth";
import { createProfile } from "@/services/profile/create-profile";
import { deleteProfile } from "@/services/profile/delete-profile";
import { getProfiles } from "@/services/profile/get-profiles";
import { updateProfile } from "@/services/profile/update-profile";
import { z } from "../../lib/zod";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function requireAdmin(
	request: { headers: Record<string, unknown> },
	reply: { status: (code: number) => { send: (body: unknown) => void } },
) {
	const session = await auth.api
		.getSession({
			headers: new Headers(request.headers as Record<string, string>),
		})
		.catch(() => null);

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

const profileSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string(),
	createdAt: z.string().datetime(),
});

const listProfilesResponse = z.object({ result: z.array(profileSchema) });

const profileRelationsSchema = z.object({
	users: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			email: z.string(),
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

const profileBodyBaseSchema = z.object({
	name: z.string().min(2).optional(),
	description: z.string().optional(),
	userIds: z.array(z.string().uuid()).optional(),
	roomIds: z.array(z.string().uuid()).optional(),
	roomTypeIds: z.array(z.string().uuid()).optional(),
});

// ── Route ─────────────────────────────────────────────────────────────────────

export const profileRoute: FastifyPluginAsyncZod = async (app) => {
	// GET /profiles
	app.get(
		"/",
		{
			schema: {
				tags: ["profiles"],
				summary: "Listar perfis",
				security: [{ sessionCookie: [] }],
				response: { 200: listProfilesResponse },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;

			const profiles = await getProfiles();
			const payload = {
				result: profiles.result.map((p: (typeof profiles.result)[number]) => ({
					...p,
					createdAt: p.createdAt.toISOString(),
				})),
			};
			return reply.status(200).send(payload);
		},
	);

	// GET /profiles/:id/relations
	app.get(
		"/:id/relations",
		{
			schema: {
				tags: ["profiles"],
				summary: "Vínculos do perfil",
				description: "Retorna os usuários e salas associados ao perfil.",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				response: { 200: profileRelationsSchema },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;

			const { id: profileId } = request.params as { id: string };

			const [users, rooms, roomTypes] = await Promise.all([
				db
					.select({
						id: user.id,
						name: user.name,
						email: user.email,
					})
					.from(userProfile)
					.innerJoin(user, eq(userProfile.userId, user.id))
					.where(eq(userProfile.profileId, profileId)),

				db
					.select({
						id: room.id,
						name: room.name,
						blockId: room.blockId,
					})
					.from(profileRoomPermission)
					.innerJoin(room, eq(profileRoomPermission.roomId, room.id))
					.where(eq(profileRoomPermission.profileId, profileId)),

				db
					.select({
						id: roomType.id,
						name: roomType.name,
						abbreviation: roomType.abbreviation,
					})
					.from(profileRoomTypePermission)
					.innerJoin(
						roomType,
						eq(profileRoomTypePermission.roomTypeId, roomType.id),
					)
					.where(eq(profileRoomTypePermission.profileId, profileId)),
			]);

			return reply.status(200).send({ users, rooms, roomTypes });
		},
	);

	// POST /profiles
	app.post(
		"/",
		{
			schema: {
				tags: ["profiles"],
				summary: "Criar perfil",
				description:
					"Cria um novo perfil de acesso. Opcionalmente vincula usuários, salas e tipos de sala.",
				security: [{ sessionCookie: [] }],
				body: profileBodyBaseSchema.extend({ name: z.string().min(2) }),
				response: { 201: profileSchema },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;

			const { name, description, userIds, roomIds, roomTypeIds } =
				request.body as {
					name: string;
					description?: string;
					userIds?: string[];
					roomIds?: string[];
					roomTypeIds?: string[];
				};

			const created = await createProfile({
				name,
				description,
				userIds,
				roomIds,
				roomTypeIds,
			});
			return reply
				.status(201)
				.send({ ...created, createdAt: created.createdAt.toISOString() });
		},
	);

	// PUT /profiles/:id
	app.put(
		"/:id",
		{
			schema: {
				tags: ["profiles"],
				summary: "Atualizar perfil",
				description:
					"Atualiza os dados do perfil e sincroniza usuários, salas e tipos de sala associados.",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				body: profileBodyBaseSchema,
				response: { 200: profileSchema },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;

			const { id } = request.params as { id: string };
			const { name, description, userIds, roomIds, roomTypeIds } =
				request.body as {
					name?: string;
					description?: string;
					userIds?: string[];
					roomIds?: string[];
					roomTypeIds?: string[];
				};

			const updated = await updateProfile({
				id,
				name,
				description,
				userIds,
				roomIds,
				roomTypeIds,
			});
			return reply
				.status(200)
				.send({ ...updated, createdAt: updated.createdAt.toISOString() });
		},
	);

	// DELETE /profiles/:id
	app.delete(
		"/:id",
		{
			schema: {
				tags: ["profiles"],
				summary: "Excluir perfil",
				description: "Remove um perfil do sistema.",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;

			const { id } = request.params as { id: string };
			await deleteProfile(id);
			return reply.status(204).send();
		},
	);

	// POST /profiles/:id/users — atribuir um único usuário
	app.post(
		"/:id/users",
		{
			schema: {
				tags: ["profiles"],
				summary: "Atribuir usuário a um perfil",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				body: z.object({ userId: z.string().uuid() }),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;

			const { id: profileId } = request.params as { id: string };
			const { userId } = request.body as { userId: string };

			await db
				.insert(userProfile)
				.values({ userId, profileId })
				.onConflictDoNothing();

			return reply.status(204).send();
		},
	);

	// DELETE /profiles/:id/users/:userId — remover um único usuário
	app.delete(
		"/:id/users/:userId",
		{
			schema: {
				tags: ["profiles"],
				summary: "Remover usuário de um perfil",
				security: [{ sessionCookie: [] }],
				params: z.object({
					id: z.string().uuid(),
					userId: z.string().uuid(),
				}),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;

			const { id: profileId, userId } = request.params as {
				id: string;
				userId: string;
			};

			await db
				.delete(userProfile)
				.where(
					and(
						eq(userProfile.profileId, profileId),
						eq(userProfile.userId, userId),
					),
				);

			return reply.status(204).send();
		},
	);

	// POST /profiles/:id/rooms — atribuir uma única sala
	app.post(
		"/:id/rooms",
		{
			schema: {
				tags: ["profiles"],
				summary: "Atribuir sala a um perfil",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				body: z.object({ roomId: z.string().uuid() }),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;

			const { id: profileId } = request.params as { id: string };
			const { roomId } = request.body as { roomId: string };

			await db
				.insert(profileRoomPermission)
				.values({ id: uuidv7(), profileId, roomId })
				.onConflictDoNothing();

			return reply.status(204).send();
		},
	);

	// DELETE /profiles/:id/rooms/:roomId — remover uma única sala
	app.delete(
		"/:id/rooms/:roomId",
		{
			schema: {
				tags: ["profiles"],
				summary: "Remover sala de um perfil",
				security: [{ sessionCookie: [] }],
				params: z.object({
					id: z.string().uuid(),
					roomId: z.string().uuid(),
				}),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as AdminReply)))
				return;

			const { id: profileId, roomId } = request.params as {
				id: string;
				roomId: string;
			};

			await db
				.delete(profileRoomPermission)
				.where(
					and(
						eq(profileRoomPermission.profileId, profileId),
						eq(profileRoomPermission.roomId, roomId),
					),
				);

			return reply.status(204).send();
		},
	);
};
