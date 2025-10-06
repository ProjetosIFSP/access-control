import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { SchemaWithExamples } from "@/api/openapi";
import { z } from "@/lib/zod";
import { doorStateEnum } from "@/db/schema/enums";
import { getRooms } from "@/services/room/get-room";

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
};
