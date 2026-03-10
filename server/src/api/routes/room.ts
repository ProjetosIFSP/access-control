import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { and, eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { SchemaWithExamples } from "@/api/openapi";
import { db } from "@/db";
import { userRoomPermission } from "@/db/schema/access";
import { user } from "@/db/schema/auth";
import { doorStateEnum } from "@/db/schema/enums";
import { profile, profileRoomPermission } from "@/db/schema/profile";
import { requireAdmin, resolveSession, type GuardReply } from "@/lib/require-admin";
import { z } from "@/lib/zod";
import { addUserRoomPermission } from "@/services/permissions/add-user-room-permission";
import { removeUserRoomPermission } from "@/services/permissions/remove-user-room-permission";
import { createRoom } from "@/services/room/create-room";
import { deleteRoom } from "@/services/room/delete-room";
import { getRooms } from "@/services/room/get-room";
import { getRoomsSummary } from "@/services/room/get-rooms-summary";
import { updateRoom } from "@/services/room/update-room";
import { getRoomAccessLogs } from "@/services/iot/get-room-access-logs";



// ── Schemas ───────────────────────────────────────────────────────────────────

const doorStateValues = doorStateEnum.enumValues as [
	(typeof doorStateEnum.enumValues)[number],
	...(typeof doorStateEnum.enumValues)[number][],
];

const doorStateSchema = z.enum(doorStateValues);

const roomSummarySchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	blockId: z.string().uuid(),
	typeId: z.string().uuid(),
	requiresBiometry: z.boolean(),
	requiresRFID: z.boolean(),
	isLocked: z.boolean().nullable(),
	doorState: doorStateSchema,
	lastStatusUpdateAt: z.string().datetime().nullable(),
	createdAt: z.string().datetime(),
});

const blockSummarySchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
});

const listRoomsResponseSchema = z.object({
	result: z.array(
		z.object({
			room: roomSummarySchema,
			block: blockSummarySchema,
		}),
	),
	total: z.number(),
	page: z.number(),
	pageSize: z.number(),
	totalPages: z.number(),
});

const listRoomsResponseExample: z.infer<typeof listRoomsResponseSchema> = {
	total: 1,
	page: 1,
	pageSize: 20,
	totalPages: 1,
	result: [
		{
			room: {
				id: "cdea3efb-650d-4c8a-a9c0-8ee97d739f5c",
				name: "Laboratório 101",
				blockId: "1cf51c96-86a9-4fb3-b8e8-556a745d4423",
				typeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
				requiresBiometry: false,
				requiresRFID: false,
				isLocked: true,
				doorState: "CLOSED",
				lastStatusUpdateAt: "2025-02-20T14:30:00.000Z",
				createdAt: "2024-12-15T11:22:00.000Z",
			},
			block: {
				id: "1cf51c96-86a9-4fb3-b8e8-556a745d4423",
				name: "Prédio Principal",
			},
		},
	],
};

// ── /rooms/summary schemas ────────────────────────────────────────────────────

const roomStateSchema = z.enum(["aberta", "fechada", "alerta"]);

const userInfoSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email: z.string().email(),
});

const roomSummaryItemBaseSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	typeAbbreviation: z.string(),
	state: roomStateSchema,
	lastStatusUpdateAt: z.string().datetime().nullable(),
});

const roomSummaryItemAuthSchema = roomSummaryItemBaseSchema.extend({
	currentUser: userInfoSchema.nullable(),
	lastUser: userInfoSchema.nullable(),
});

const blockWithRoomsBaseSchema = z.object({
	block: z.object({ id: z.string().uuid(), name: z.string() }),
	rooms: z.array(roomSummaryItemBaseSchema),
});

const blockWithRoomsAuthSchema = z.object({
	block: z.object({ id: z.string().uuid(), name: z.string() }),
	rooms: z.array(roomSummaryItemAuthSchema),
});

const roomsSummaryResponseSchema = z.object({
	authenticated: z.boolean(),
	isAdmin: z.boolean(),
	result: z.array(
		z.union([blockWithRoomsAuthSchema, blockWithRoomsBaseSchema]),
	),
});

const roomsSummaryResponseExample: z.infer<typeof roomsSummaryResponseSchema> =
	{
		authenticated: true,
		isAdmin: true,
		result: [
			{
				block: { id: "1cf51c96-86a9-4fb3-b8e8-556a745d4423", name: "Bloco A" },
				rooms: [
					{
						id: "cdea3efb-650d-4c8a-a9c0-8ee97d739f5c",
						name: "Laboratório 101",
						typeAbbreviation: "LAB",
						state: "aberta",
						lastStatusUpdateAt: "2025-02-20T14:30:00.000Z",
						currentUser: {
							id: "7b3cf58e-353f-48de-b2fd-6f203d64d3f8",
							name: "Ana Souza",
							email: "ana.souza@ifsp.edu.br",
						},
						lastUser: {
							id: "7b3cf58e-353f-48de-b2fd-6f203d64d3f8",
							name: "Ana Souza",
							email: "ana.souza@ifsp.edu.br",
						},
					},
				],
			},
		],
	};

// ── Body & relation schemas ───────────────────────────────────────────────────

const roomBodySchema = z.object({
	name: z.string().min(2),
	blockId: z.string().uuid(),
	typeId: z.string().uuid(),
	requiresBiometry: z.boolean().optional(),
	requiresRFID: z.boolean().optional(),
	profileIds: z.array(z.string().uuid()).optional(),
	userIds: z.array(z.string().uuid()).optional(),
});

const roomRelationsSchema = z.object({
	profiles: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			description: z.string(),
		}),
	),
	users: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			email: z.string(),
		}),
	),
});

// ── Route ─────────────────────────────────────────────────────────────────────

export const roomRoute: FastifyPluginAsyncZod = async (app) => {
	// ── GET /rooms/summary ──────────────────────────────────────────────────────
	app.get(
		"/summary",
		{
			schema: {
				tags: ["rooms"],
				summary: "Resumo de salas agrupadas por bloco",
				description:
					"Retorna todas as salas agrupadas por bloco com nome, tipo, estado e horário da última atualização. " +
					"Se o chamador estiver autenticado, inclui também quem está usando a sala no momento e quem foi o último utilizador.",
				querystring: z.object({
					q: z
						.string()
						.optional()
						.describe(
							"Filtro de busca por nome da sala, bloco ou (para admin) usuário",
						),
					type: z
						.string()
						.optional()
						.describe("Filtrar por abreviação do tipo de sala"),
					state: z
						.enum(["aberta", "fechada", "alerta"])
						.optional()
						.describe("Filtrar por estado da porta"),
				}),
				response: {
					200: roomsSummaryResponseSchema,
				},
				responseExamples: {
					200: roomsSummaryResponseExample,
				},
			} satisfies SchemaWithExamples,
		},
		async (request, reply) => {
			const session = await resolveSession(request);

			const authenticated = !!session?.user;
			const isAdmin =
				authenticated && !!(session?.user as Record<string, unknown>)?.isAdmin;
			const { q, type, state } = request.query;
			const summary = await getRoomsSummary(authenticated, isAdmin, {
				q,
				type,
				state,
			});

			return reply.status(200).send({ authenticated, isAdmin, ...summary });
		},
	);

	// ── GET /rooms ──────────────────────────────────────────────────────────────
	app.get(
		"/",
		{
			schema: {
				tags: ["rooms"],
				summary: "Listar salas e blocos",
				description:
					"Retorna as salas cadastradas, incluindo estado atual da porta e informações do bloco.",
				security: [{ sessionCookie: [] }],
				querystring: z.object({
					q: z.string().optional().describe("Filtrar por nome da sala"),
					typeIds: z
						.string()
						.optional()
						.describe("IDs de tipos separados por vírgula"),
					blockIds: z
						.string()
						.optional()
						.describe("IDs de blocos separados por vírgula"),
					page: z.coerce.number().int().min(1).optional().default(1),
					pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
				}),
				response: {
					200: listRoomsResponseSchema,
				},
				responseExamples: {
					200: listRoomsResponseExample,
				},
			} satisfies SchemaWithExamples,
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as GuardReply)))
				return;

			const { q, typeIds, blockIds, page, pageSize } = request.query as {
				q?: string;
				typeIds?: string;
				blockIds?: string;
				page?: number;
				pageSize?: number;
			};
			const typeIdsArray = typeIds?.trim()
				? typeIds
						.split(",")
						.map((id) => id.trim())
						.filter(Boolean)
				: undefined;
			const blockIdsArray = blockIds?.trim()
				? blockIds
						.split(",")
						.map((id) => id.trim())
						.filter(Boolean)
				: undefined;

			const rooms = await getRooms({
				q,
				typeIds: typeIdsArray,
				blockIds: blockIdsArray,
				page: page ?? 1,
				pageSize: pageSize ?? 20,
			});
			const payload: z.infer<typeof listRoomsResponseSchema> = {
				result: rooms.result.map(({ room, block }) => ({
					room: {
						...room,
						requiresBiometry: room.requiresBiometry ?? false,
						requiresRFID: room.requiresRFID ?? false,
						lastStatusUpdateAt: room.lastStatusUpdateAt?.toISOString() ?? null,
						createdAt: room.createdAt.toISOString(),
					},
					block,
				})),
				total: rooms.total,
				page: rooms.page,
				pageSize: rooms.pageSize,
				totalPages: rooms.totalPages,
			};
			return reply.status(200).send(payload);
		},
	);

	// ── GET /rooms/:id/relations ────────────────────────────────────────────────
	app.get(
		"/:id/relations",
		{
			schema: {
				tags: ["rooms"],
				summary: "Vínculos da sala",
				description:
					"Retorna os perfis e usuários com acesso direto associados à sala.",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				response: { 200: roomRelationsSchema },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as GuardReply)))
				return;

			const { id: roomId } = request.params as { id: string };

			const [profiles, users] = await Promise.all([
				db
					.select({
						id: profile.id,
						name: profile.name,
						description: profile.description,
					})
					.from(profileRoomPermission)
					.innerJoin(profile, eq(profileRoomPermission.profileId, profile.id))
					.where(eq(profileRoomPermission.roomId, roomId)),

				db
					.select({
						id: user.id,
						name: user.name,
						email: user.email,
					})
					.from(userRoomPermission)
					.innerJoin(user, eq(userRoomPermission.userId, user.id))
					.where(eq(userRoomPermission.roomId, roomId)),
			]);

			return reply.status(200).send({ profiles, users });
		},
	);

	// ── POST /rooms ─────────────────────────────────────────────────────────────
	app.post(
		"/",
		{
			schema: {
				tags: ["rooms"],
				summary: "Criar sala",
				description:
					"Cria uma nova sala. Opcionalmente vincula perfis e usuários com acesso direto.",
				security: [{ sessionCookie: [] }],
				body: roomBodySchema,
				response: {
					201: roomSummarySchema,
				},
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as GuardReply)))
				return;

			const {
				name,
				blockId,
				typeId,
				requiresBiometry,
				requiresRFID,
				profileIds,
				userIds,
			} = request.body as z.infer<typeof roomBodySchema>;

			const created = await createRoom({
				name,
				blockId,
				typeId,
				requiresBiometry,
				requiresRFID,
				profileIds,
				userIds,
			});

			return reply.status(201).send({
				...created,
				requiresBiometry: created.requiresBiometry ?? false,
				requiresRFID: created.requiresRFID ?? false,
				lastStatusUpdateAt: created.lastStatusUpdateAt?.toISOString() ?? null,
				createdAt: created.createdAt.toISOString(),
			});
		},
	);

	// ── PUT /rooms/:id ──────────────────────────────────────────────────────────
	app.put(
		"/:id",
		{
			schema: {
				tags: ["rooms"],
				summary: "Atualizar sala",
				description:
					"Atualiza os dados de uma sala e sincroniza perfis e usuários com acesso direto.",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				body: roomBodySchema.partial(),
				response: {
					200: roomSummarySchema,
				},
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as GuardReply)))
				return;

			const { id } = request.params as { id: string };
			const {
				name,
				blockId,
				typeId,
				requiresBiometry,
				requiresRFID,
				profileIds,
				userIds,
			} = request.body as Partial<z.infer<typeof roomBodySchema>>;

			const updated = await updateRoom({
				id,
				name,
				blockId,
				typeId,
				requiresBiometry,
				requiresRFID,
				profileIds,
				userIds,
			});

			return reply.status(200).send({
				...updated,
				requiresBiometry: updated.requiresBiometry ?? false,
				requiresRFID: updated.requiresRFID ?? false,
				lastStatusUpdateAt: updated.lastStatusUpdateAt?.toISOString() ?? null,
				createdAt: updated.createdAt.toISOString(),
			});
		},
	);

	// ── DELETE /rooms/:id ───────────────────────────────────────────────────────
	app.delete(
		"/:id",
		{
			schema: {
				tags: ["rooms"],
				summary: "Excluir sala",
				description: "Remove uma sala do sistema.",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as GuardReply)))
				return;

			const { id } = request.params as { id: string };
			await deleteRoom(id);
			return reply.status(204).send();
		},
	);

	// ── POST /rooms/:id/profiles ────────────────────────────────────────────────
	app.post(
		"/:id/profiles",
		{
			schema: {
				tags: ["rooms"],
				summary: "Atribuir perfil à sala",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				body: z.object({ profileId: z.string().uuid() }),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as GuardReply)))
				return;

			const { id: roomId } = request.params as { id: string };
			const { profileId } = request.body as { profileId: string };

			await db
				.insert(profileRoomPermission)
				.values({ id: uuidv7(), profileId, roomId })
				.onConflictDoNothing();

			return reply.status(204).send();
		},
	);

	// ── DELETE /rooms/:id/profiles/:profileId ───────────────────────────────────
	app.delete(
		"/:id/profiles/:profileId",
		{
			schema: {
				tags: ["rooms"],
				summary: "Remover perfil da sala",
				security: [{ sessionCookie: [] }],
				params: z.object({
					id: z.string().uuid(),
					profileId: z.string().uuid(),
				}),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as GuardReply)))
				return;

			const { id: roomId, profileId } = request.params as {
				id: string;
				profileId: string;
			};

			await db
				.delete(profileRoomPermission)
				.where(
					and(
						eq(profileRoomPermission.roomId, roomId),
						eq(profileRoomPermission.profileId, profileId),
					),
				);

			return reply.status(204).send();
		},
	);

	// ── POST /rooms/:id/users ───────────────────────────────────────────────────
	app.post(
		"/:id/users",
		{
			schema: {
				tags: ["rooms"],
				summary: "Atribuir permissão direta de usuário à sala",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				body: z.object({
					userId: z.string().uuid(),
					expiresAt: z.string().datetime().optional(),
				}),
				response: { 201: z.object({ id: z.string().uuid() }) },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as GuardReply)))
				return;

			const { id: roomId } = request.params as { id: string };
			const { userId, expiresAt } = request.body as {
				userId: string;
				expiresAt?: string;
			};

			const res = await addUserRoomPermission(
				userId,
				roomId,
				expiresAt ? new Date(expiresAt) : undefined,
			);
			return reply.status(201).send(res);
		},
	);

	// ── DELETE /rooms/:id/users/:userId ─────────────────────────────────────────
	app.delete(
		"/:id/users/:userId",
		{
			schema: {
				tags: ["rooms"],
				summary: "Remover permissão direta de usuário da sala",
				security: [{ sessionCookie: [] }],
				params: z.object({
					id: z.string().uuid(),
					userId: z.string().uuid(),
				}),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as GuardReply)))
				return;

			const { id: roomId, userId } = request.params as {
				id: string;
				userId: string;
			};

			await removeUserRoomPermission(userId, roomId);
			return reply.status(204).send();
		},
	);

	// ── POST /rooms/:id/users/bulk — sincronizar lista completa de usuários ──────
	app.post(
		"/:id/users/bulk",
		{
			schema: {
				tags: ["rooms"],
				summary: "Sincronizar usuários com acesso direto à sala",
				description:
					"Substitui completamente a lista de usuários com permissão direta para a sala.",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				body: z.object({ userIds: z.array(z.string().uuid()) }),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as GuardReply)))
				return;

			const { id: roomId } = request.params as { id: string };
			const { userIds } = request.body as { userIds: string[] };

			const current = await db
				.select({ userId: userRoomPermission.userId })
				.from(userRoomPermission)
				.where(eq(userRoomPermission.roomId, roomId));

			const currentSet = new Set(current.map((r) => r.userId));
			const nextSet = new Set(userIds);

			const toAdd = userIds.filter((id) => !currentSet.has(id));
			const toRemove = [...currentSet].filter((id) => !nextSet.has(id));

			if (toAdd.length > 0) {
				await db
					.insert(userRoomPermission)
					.values(toAdd.map((userId) => ({ id: uuidv7(), userId, roomId })))
					.onConflictDoNothing();
			}

			if (toRemove.length > 0) {
				await db
					.delete(userRoomPermission)
					.where(
						and(
							eq(userRoomPermission.roomId, roomId),
							inArray(userRoomPermission.userId, toRemove),
						),
					);
			}

			return reply.status(204).send();
		},
	);

	// ── POST /rooms/:id/profiles/bulk — sincronizar lista completa de perfis ─────
	app.post(
		"/:id/profiles/bulk",
		{
			schema: {
				tags: ["rooms"],
				summary: "Sincronizar perfis com acesso à sala",
				description:
					"Substitui completamente a lista de perfis com permissão para a sala.",
				security: [{ sessionCookie: [] }],
				params: z.object({ id: z.string().uuid() }),
				body: z.object({ profileIds: z.array(z.string().uuid()) }),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			if (!(await requireAdmin(request, reply as unknown as GuardReply)))
				return;

			const { id: roomId } = request.params as { id: string };
			const { profileIds } = request.body as { profileIds: string[] };

			const current = await db
				.select({ profileId: profileRoomPermission.profileId })
				.from(profileRoomPermission)
				.where(eq(profileRoomPermission.roomId, roomId));

			const currentSet = new Set(current.map((r) => r.profileId));
			const nextSet = new Set(profileIds);

			const toAdd = profileIds.filter((id) => !currentSet.has(id));
			const toRemove = [...currentSet].filter((id) => !nextSet.has(id));

			if (toAdd.length > 0) {
				await db
					.insert(profileRoomPermission)
					.values(
						toAdd.map((profileId) => ({ id: uuidv7(), profileId, roomId })),
					)
					.onConflictDoNothing();
			}

			if (toRemove.length > 0) {
				await db
					.delete(profileRoomPermission)
					.where(
						and(
							eq(profileRoomPermission.roomId, roomId),
							inArray(profileRoomPermission.profileId, toRemove),
						),
					);
			}

			return reply.status(204).send();
		},
	);

	// ── GET /rooms/:id/access-logs ──────────────────────────────────────────────
	app.get(
		"/:id/access-logs",
		{
			schema: {
				tags: ["rooms"],
				summary: "Logs de acesso recentes de uma sala",
				description:
					"Retorna os últimos registros de acesso (GRANTED) de uma sala. Requer autenticação de admin.",
				security: [{ sessionCookie: [] }],
				params: z.object({
					id: z.string().uuid(),
				}),
				querystring: z.object({
					limit: z.coerce.number().int().min(1).max(50).optional(),
				}),
				response: {
					200: z.object({
						logs: z.array(
							z.object({
								id: z.string(),
								status: z.string(),
								reason: z.string().nullable(),
								timestamp: z.string().datetime(),
								userId: z.string().nullable(),
								userName: z.string().nullable(),
								userEmail: z.string().nullable(),
							}),
						),
					}),
				},
			} satisfies SchemaWithExamples,
		},
		async (request, reply) => {
			await requireAdmin(request, reply as GuardReply);

			const { id: roomId } = request.params;
			const limit = request.query.limit ?? 10;

			const entries = await getRoomAccessLogs(roomId, { limit });

			return reply.status(200).send({
				logs: entries.map((e) => ({
					id: e.id,
					status: e.status,
					reason: e.reason,
					timestamp: e.timestamp.toISOString(),
					userId: e.userId,
					userName: e.userName,
					userEmail: e.userEmail,
				})),
			});
		},
	);
};
