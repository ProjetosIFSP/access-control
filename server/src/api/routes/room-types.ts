import { and, asc, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { v7 as uuidv7 } from "uuid";
import { db } from "@/db";
import { userRoomTypePermission } from "@/db/schema/access";
import { profileRoomTypePermission } from "@/db/schema/profile";
import { room, roomType } from "@/db/schema/room";

const route: FastifyPluginAsync = async (fastify) => {
	fastify.get("/", async (_request, reply) => {
		const types = await db
			.select({
				id: roomType.id,
				name: roomType.name,
				abbreviation: roomType.abbreviation,
			})
			.from(roomType)
			.orderBy(asc(roomType.name));
		reply.code(200).send({ result: types });
	});

	fastify.post("/", async (request, reply) => {
		const body = request.body as any;
		const id = uuidv7();
		await db
			.insert(roomType)
			.values({
				id,
				name: body.name,
				abbreviation: body.abbreviation,
				description: body.description ?? "",
			});
		const rows = await db.select().from(roomType).where(eq(roomType.id, id));
		reply.code(201).send(rows[0]);
	});

	fastify.put("/:roomTypeId", async (request, reply) => {
		const { roomTypeId } = request.params as any;
		const body = request.body as any;
		const existing = await db
			.select({ id: roomType.id })
			.from(roomType)
			.where(eq(roomType.id, roomTypeId));
		if (!existing[0])
			return reply.code(404).send({ message: "Tipo de sala não encontrado." });
		await db
			.update(roomType)
			.set({
				name: body.name,
				abbreviation: body.abbreviation,
				description: body.description ?? "",
			})
			.where(eq(roomType.id, roomTypeId));
		const rows = await db
			.select()
			.from(roomType)
			.where(eq(roomType.id, roomTypeId));
		reply.code(200).send(rows[0]);
	});

	fastify.delete("/:roomTypeId", async (request, reply) => {
		const { roomTypeId } = request.params as any;
		const existing = await db
			.select({ id: roomType.id })
			.from(roomType)
			.where(eq(roomType.id, roomTypeId));
		if (!existing[0])
			return reply.code(404).send({ message: "Tipo de sala não encontrado." });
		const roomsUsing = await db
			.select({ id: room.id })
			.from(room)
			.where(eq(room.typeId, roomTypeId))
			.limit(1);
		if (roomsUsing.length > 0) {
			return reply
				.code(409)
				.send({
					message:
						"Existem salas associadas a este tipo. Remova as salas primeiro.",
				});
		}
		await db.delete(roomType).where(eq(roomType.id, roomTypeId));
		reply.code(204).send();
	});

	fastify.post("/:roomTypeId/users", async (request, reply) => {
		const { roomTypeId } = request.params as any;
		const body = request.body as any;
		const id = uuidv7();
		await db
			.insert(userRoomTypePermission)
			.values({ id, userId: body.userId, roomTypeId });
		reply.code(204).send();
	});

	fastify.delete("/:roomTypeId/users/:userId", async (request, reply) => {
		const { roomTypeId, userId } = request.params as any;
		await db
			.delete(userRoomTypePermission)
			.where(
				and(
					eq(userRoomTypePermission.userId, userId),
					eq(userRoomTypePermission.roomTypeId, roomTypeId),
				),
			);
		reply.code(204).send();
	});

	fastify.post("/:roomTypeId/profiles", async (request, reply) => {
		const { roomTypeId } = request.params as any;
		const body = request.body as any;
		const id = uuidv7();
		await db
			.insert(profileRoomTypePermission)
			.values({ id, profileId: body.profileId, roomTypeId });
		reply.code(204).send();
	});

	fastify.delete("/:roomTypeId/profiles/:profileId", async (request, reply) => {
		const { roomTypeId, profileId } = request.params as any;
		await db
			.delete(profileRoomTypePermission)
			.where(
				and(
					eq(profileRoomTypePermission.profileId, profileId),
					eq(profileRoomTypePermission.roomTypeId, roomTypeId),
				),
			);
		reply.code(204).send();
	});
};

export const roomTypesRoute = route;
export default roomTypesRoute;
