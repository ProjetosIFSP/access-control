import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { getUsers } from "@/services/user/get-user";

export const userRoute: FastifyPluginAsyncZod = async (app) => {
	app.get("/", async (_request, reply) => {
		const users = await getUsers();
		return reply.status(200).send(users);
	});
};
