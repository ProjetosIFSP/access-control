import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "@/lib/zod";
import { getLogs } from "@/services/logs/get-logs";

const logItemSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date().or(z.string()),
  status: z.enum(["GRANTED", "DENIED"]),
  reason: z.string().nullable(),
  credentialValueUsed: z.string(),
  roomName: z.string(),
  blockName: z.string(),
  roomId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  userName: z.string().nullable(),
  userEmail: z.string().email().nullable(),
});

const getLogsResponseSchema = z.object({
  items: z.array(logItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export const logsRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/",
    {
      schema: {
        tags: ["logs"],
        summary: "Listar logs de acesso",
        description: "Retorna os logs de acesso paginados com suporte a filtros.",
        security: [{ sessionCookie: [] }],
        querystring: z.object({
          roomId: z.string().uuid().optional(),
          userId: z.string().uuid().optional(),
          status: z.enum(["GRANTED", "DENIED"]).optional(),
          page: z.coerce.number().int().min(1).optional().default(1),
          pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
        }),
        response: { 200: getLogsResponseSchema },
      },
    },
    async (request, reply) => {
      // Require admin permissions to read logs
      if (!(await requireAdmin(request, reply as never))) return;

      const { roomId, userId, status, page, pageSize } = request.query;

      const logs = await getLogs({
        roomId,
        userId,
        status,
        page,
        pageSize,
      });

      return reply.status(200).send(logs);
    },
  );
};
