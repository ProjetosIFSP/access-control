import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "../../lib/zod";

// Esqueleto de rota para permissões e verificação de acesso
export const permissionsRoute: FastifyPluginAsyncZod = async (app) => {
	app.post(
		"/verify",
		{
			schema: {
				tags: ["access"],
				summary: "Verificar permissão multimodal (usado por controladores)",
				body: z.object({
					roomId: z.string().uuid(),
					credentialValue: z.string(),
					type: z.enum(["FINGERPRINT", "NFC_TAG"]),
				}),
				response: {
					200: z.object({
						granted: z.boolean(),
						reason: z.string().optional(),
					}),
				},
			},
		},
		async (request, reply) => {
			const { roomId, credentialValue, type } = request.body as {
				roomId: string;
				credentialValue: string;
				type: "FINGERPRINT" | "NFC_TAG";
			};
			const { verifyAccess } = await import(
				"../../services/permissions/verify-access.js"
			);
			const res = await verifyAccess({ roomId, credentialValue, type });
			return reply.status(200).send(res);
		},
	);
};
