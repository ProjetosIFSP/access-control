import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { SchemaWithExamples } from "@/api/openapi";
import { z } from "@/lib/zod";
import { doorStateEnum } from "@/db/schema/enums";
import { getRooms } from "@/services/room/get-room";
import { assignProfileToRoom } from "@/services/profile/assign-room";

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

export const roomRoute: FastifyPluginAsyncZod = async (app) => {
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
			const { db } = await import('@/db');
			const { profile, profileRoomPermission } = await import('@/db/schema/profile');
			const rows = await db
				.select({ id: profile.id, name: profile.name, description: profile.description })
				.from(profile)
				.innerJoin(profileRoomPermission, profileRoomPermission.profileId.eq(profile.id))
				.where(profileRoomPermission.roomId.eq(roomId))
				.all();
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
			const { addUserRoomPermission } = await import('@/services/permissions/add-user-room-permission');
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
			const { removeUserRoomPermission } = await import('@/services/permissions/remove-user-room-permission');
			await removeUserRoomPermission(userId, roomId);
			return reply.status(204).send();
		},
	);
};
