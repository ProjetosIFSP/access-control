import { FastifyPluginAsync } from "fastify";
import { db } from "@/db";
import { roomType } from "@/db/schema/room";
import { userRoomTypePermission } from "@/db/schema/access";
import { profileRoomTypePermission } from "@/db/schema/profile";
import { eq, and } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

const route: FastifyPluginAsync = async (fastify) => {
  fastify.post("/", async (request, reply) => {
    const body: any = request.body as any;
    const id = uuidv7();
    await db.insert(roomType).values({ id, name: body.name, description: body.description ?? "" });
    const rows = await db.select().from(roomType).where(eq(roomType.id, id));
    reply.code(201).send(rows[0]);
  });

  fastify.post("/:roomTypeId/users", async (request, reply) => {
    const { roomTypeId } = request.params as any;
    const body: any = request.body as any;
    const id = uuidv7();
    await db.insert(userRoomTypePermission).values({ id, userId: body.userId, roomTypeId });
    reply.code(204).send();
  });

  fastify.delete("/:roomTypeId/users/:userId", async (request, reply) => {
    const { roomTypeId, userId } = request.params as any;
    await db.delete(userRoomTypePermission).where(and(eq(userRoomTypePermission.userId, userId), eq(userRoomTypePermission.roomTypeId, roomTypeId)));
    reply.code(204).send();
  });

  fastify.post("/:roomTypeId/profiles", async (request, reply) => {
    const { roomTypeId } = request.params as any;
    const body: any = request.body as any;
    const id = uuidv7();
    await db.insert(profileRoomTypePermission).values({ id, profileId: body.profileId, roomTypeId });
    reply.code(204).send();
  });

  fastify.delete("/:roomTypeId/profiles/:profileId", async (request, reply) => {
    const { roomTypeId, profileId } = request.params as any;
    await db.delete(profileRoomTypePermission).where(and(eq(profileRoomTypePermission.profileId, profileId), eq(profileRoomTypePermission.roomTypeId, roomTypeId)));
    reply.code(204).send();
  });
};

export const roomTypesRoute = route;
export default roomTypesRoute;
