import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { getRooms } from "@/services/room/get-room";

export const roomRoute: FastifyPluginAsyncZod = async (app) => {
	app.get("/", async (_request, reply) => {
		const rooms = await getRooms();
		return reply.status(200).send(rooms);
	});
};
