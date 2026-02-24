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
        body: z.object({ roomId: z.string().uuid(), credentialValue: z.string(), type: z.enum(["BIOMETRY", "RFID"]) }),
        response: { 200: z.object({ granted: z.boolean(), reason: z.string().optional() }) },
      },
    },
    async (request, reply) => {
      // Placeholder: delegar para serviço de verificação
      // Exemplo de resposta
      return reply.status(200).send({ granted: false, reason: "NOT_IMPLEMENTED" });
    },
  );
};
