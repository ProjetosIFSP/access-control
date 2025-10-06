import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { auth } from "@/lib/auth";

export const authRoute: FastifyPluginAsyncZod = async (app) => {
	app.route({
		method: ["GET", "POST"],
		url: "/auth/*",
		schema: {
			tags: ["auth"],
			summary: "Delegar operações de autenticação",
			description:
				"Proxy reverso para o Auth.js, responsável pelos fluxos de login, callback de provedores e sessões baseadas em cookie.",
		},
		async handler(request, reply) {
			try {
				const url = new URL(request.url, `http://${request.headers.host}`);

				const headers = new Headers();
				Object.entries(request.headers).forEach(([key, value]) => {
					if (value) headers.append(key, value.toString());
				});

				const req = new Request(url.toString(), {
					method: request.method,
					headers,
					body: request.body ? JSON.stringify(request.body) : undefined,
				});

				const response = await auth.handler(req);
				reply.status(response.status);
				response.headers.forEach((value, key) => {
					reply.header(key, value);
				});
				reply.send(response.body ? await response.text() : null);
			} catch (error) {
				reply.status(500).send({
					error: "Internal authentication error",
					code: "AUTH_FAILURE",
					message: error instanceof Error ? error.message : String(error),
				});
			}
		},
	});
};
