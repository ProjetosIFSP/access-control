import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { SchemaWithExamples } from "@/api/openapi";
import { z } from "@/lib/zod";
import { doorStateEnum } from "@/db/schema/enums";
import { getRooms } from "@/services/room/get-room";
import { getRoomsSummary } from "@/services/room/get-rooms-summary";
import { client } from "@/db";
import { assignProfileToRoom } from "@/services/profile/assign-room";
import { auth } from "@/lib/auth";

const doorStateValues = doorStateEnum.enumValues as [
	typeof doorStateEnum.enumValues[number],
	...typeof doorStateEnum.enumValues[number][],
];

const doorStateSchema = z.enum(doorStateValues);

const roomSummarySchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	blockId: z.string().uuid(),
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
});

const listRoomsResponseExample: z.infer<typeof listRoomsResponseSchema> = {
	result: [
		{
			room: {
				id: "cdea3efb-650d-4c8a-a9c0-8ee97d739f5c",
				name: "Laboratório 101",
				blockId: "1cf51c96-86a9-4fb3-b8e8-556a745d4423",
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
	result: z.array(
		z.union([blockWithRoomsAuthSchema, blockWithRoomsBaseSchema]),
	),
});

const roomsSummaryResponseExample: z.infer<typeof roomsSummaryResponseSchema> =
	{
		authenticated: true,
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

// ─────────────────────────────────────────────────────────────────────────────

export const roomRoute: FastifyPluginAsyncZod = async (app) => {
	// ── GET /rooms/summary ──────────────────────────────────────────────────────
	app.get(
		"/summary",
		{
			schema: {
				tags: ["rooms"],
				summary: "Resumo de salas agrupadas por bloco",
				description:
					"Retorna todas as salas agrupadas por bloco com nome, tipo, estado (aberta/fechada/alerta) e horário da última atualização. " +
					"Se o chamador estiver autenticado, inclui também quem está usando a sala no momento e quem foi o último utilizador.",
				querystring: z.object({
					q: z.string().optional().describe("Filtro de busca por nome da sala ou do bloco"),
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
			// Resolve session without throwing – endpoint is public but enriches data when auth'd
			const session = await auth.api
				.getSession({ headers: new Headers(request.headers as Record<string, string>) })
				.catch(() => null);

			const authenticated = !!session?.user;
			const { q } = request.query;
			const summary = await getRoomsSummary(authenticated, q);

			return reply.status(200).send({ authenticated, ...summary });
		},
	);

	app.get(
		"/",
		{
			schema: {
				tags: ["rooms"],
				summary: "Listar salas e blocos",
				description:
					"Retorna as salas cadastradas, incluindo estado atual da porta e informações do bloco.",
				security: [{ sessionCookie: [] }],
				response: {
					200: listRoomsResponseSchema,
				},
				responseExamples: {
					200: listRoomsResponseExample,
				},
			} satisfies SchemaWithExamples,
		},
		async (_request, reply) => {
			const rooms = await getRooms();
			const payload: z.infer<typeof listRoomsResponseSchema> = {
				result: rooms.result.map(({ room, block }) => ({
					room: {
						...room,
						lastStatusUpdateAt: room.lastStatusUpdateAt?.toISOString() ?? null,
						createdAt: room.createdAt.toISOString(),
					},
					block,
				})),
			};
			return reply.status(200).send(payload);
		},
	);

	app.get(
		"/:id/profiles",
		{
			schema: {
				tags: ["profiles"],
				summary: "Listar perfis associados a uma sala",
				params: z.object({ id: z.string().uuid() }),
				response: { 200: z.object({ result: z.array(z.object({ id: z.string().uuid(), name: z.string(), description: z.string() })) }) },
			},
		},
		async (request, reply) => {
			const roomId = request.params.id as string;
						const rows = await client<{ id: string; name: string; description: string }[]>`
							SELECT p.id, p.name, p.description
							FROM profile p
							INNER JOIN profile_room_permission pr ON pr.profile_id = p.id
							WHERE pr.room_id = ${roomId}
						`;
						return reply.status(200).send({ result: rows });
		},
	);

	app.post(
		"/:id/profiles",
		{
			schema: {
				tags: ["profiles"],
				summary: "Atribuir perfil à sala",
				params: z.object({ id: z.string().uuid() }),
				body: z.object({ profileId: z.string().uuid() }),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			const roomId = request.params.id as string;
			const { profileId } = request.body as { profileId: string };
			await assignProfileToRoom(profileId, roomId);
			return reply.status(204).send();
		},
	);

	app.post(
		"/:id/users",
		{
			schema: {
				tags: ["permissions"],
				summary: "Atribuir permissão direta de usuário à sala",
				params: z.object({ id: z.string().uuid() }),
				body: z.object({ userId: z.string().uuid(), expiresAt: z.string().datetime().optional() }),
				response: { 201: z.object({ id: z.string().uuid() }) },
			},
		},
		async (request, reply) => {
			const roomId = request.params.id as string;
			const { userId, expiresAt } = request.body as { userId: string; expiresAt?: string };
			const { addUserRoomPermission } = await import('../../services/permissions/add-user-room-permission.js');
			const res = await addUserRoomPermission(userId, roomId, expiresAt ? new Date(expiresAt) : undefined);
			return reply.status(201).send(res);
		},
	);

	app.delete(
		"/:id/users/:userId",
		{
			schema: {
				tags: ["permissions"],
				summary: "Remover permissão direta de usuário da sala",
				params: z.object({ id: z.string().uuid(), userId: z.string().uuid() }),
				response: { 204: z.void() },
			},
		},
		async (request, reply) => {
			const roomId = request.params.id as string;
			const userId = request.params.userId as string;
			const { removeUserRoomPermission } = await import('../../services/permissions/remove-user-room-permission.js');
			await removeUserRoomPermission(userId, roomId);
			return reply.status(204).send();
		},
	);
};
