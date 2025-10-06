import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { SchemaWithExamples } from "@/api/openapi";
import { z } from "@/lib/zod";
import { getUsers } from "@/services/user/get-user";

const userSummarySchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email: z.string().email(),
	image: z.string().nullable(),
	isAdmin: z.boolean(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	hasCredentials: z.boolean(),
});

const listUsersResponseSchema = z.object({
	result: z.array(userSummarySchema),
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
		},
	],
};

export const userRoute: FastifyPluginAsyncZod = async (app) => {
	app.get(
		"/",
		{
			schema: {
				tags: ["users"],
				summary: "Listar usuários",
				description:
					"Retorna os usuários cadastrados e indica se possuem credencial física associada.",
				security: [{ sessionCookie: [] }],
				response: {
					200: listUsersResponseSchema,
				},
				responseExamples: {
					200: listUsersResponseExample,
				},
			} satisfies SchemaWithExamples,
		},
		async (_request, reply) => {
			const users = await getUsers();
			const payload: z.infer<typeof listUsersResponseSchema> = {
				result: users.result.map((user) => ({
					...user,
					createdAt: user.createdAt.toISOString(),
					updatedAt: user.updatedAt.toISOString(),
				})),
			};
			return reply.status(200).send(payload);
		},
	);
};
