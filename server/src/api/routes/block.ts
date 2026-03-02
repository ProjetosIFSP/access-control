import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "@/lib/zod";
import { auth } from "@/lib/auth";
import { getBlocks } from "@/services/room/get-blocks";
import { createBlock } from "@/services/room/create-block";
import { updateBlock } from "@/services/room/update-block";
import { deleteBlock } from "@/services/room/delete-block";

const blockSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const listBlocksResponseSchema = z.object({
  result: z.array(blockSchema),
});

export const blockRoute: FastifyPluginAsyncZod = async (app) => {
  app.get("/", {
    schema: {
      tags: ["blocks"],
      summary: "Listar blocos",
      security: [{ sessionCookie: [] }],
      response: { 200: listBlocksResponseSchema },
    },
  }, async (request, reply) => {
    const session = await auth.api.getSession({ headers: new Headers(request.headers as Record<string, string>) }).catch(() => null);
    if (!session?.user) return reply.status(401).send({ message: "Autenticacao necessaria." } as never);
    if (!(session.user as Record<string, unknown>).isAdmin) return reply.status(403).send({ message: "Acesso restrito a administradores." } as never);
    const blocks = await getBlocks();
    return reply.status(200).send(blocks);
  });

  app.post("/", {
    schema: {
      tags: ["blocks"],
      summary: "Criar bloco",
      security: [{ sessionCookie: [] }],
      body: z.object({ name: z.string().min(2) }),
      response: { 201: blockSchema },
    },
  }, async (request, reply) => {
    const session = await auth.api.getSession({ headers: new Headers(request.headers as Record<string, string>) }).catch(() => null);
    if (!session?.user) return reply.status(401).send({ message: "Autenticacao necessaria." } as never);
    if (!(session.user as Record<string, unknown>).isAdmin) return reply.status(403).send({ message: "Acesso restrito a administradores." } as never);
    const { name } = request.body;
    const created = await createBlock({ name });
    return reply.status(201).send(created);
  });

  app.put("/:id", {
    schema: {
      tags: ["blocks"],
      summary: "Atualizar bloco",
      security: [{ sessionCookie: [] }],
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ name: z.string().min(2) }),
      response: { 200: blockSchema },
    },
  }, async (request, reply) => {
    const session = await auth.api.getSession({ headers: new Headers(request.headers as Record<string, string>) }).catch(() => null);
    if (!session?.user) return reply.status(401).send({ message: "Autenticacao necessaria." } as never);
    if (!(session.user as Record<string, unknown>).isAdmin) return reply.status(403).send({ message: "Acesso restrito a administradores." } as never);
    const { id } = request.params;
    const { name } = request.body;
    const updated = await updateBlock({ id, name });
    return reply.status(200).send(updated);
  });

  app.delete("/:id", {
    schema: {
      tags: ["blocks"],
      summary: "Excluir bloco",
      security: [{ sessionCookie: [] }],
      params: z.object({ id: z.string().uuid() }),
      response: { 204: z.void() },
    },
  }, async (request, reply) => {
    const session = await auth.api.getSession({ headers: new Headers(request.headers as Record<string, string>) }).catch(() => null);
    if (!session?.user) return reply.status(401).send({ message: "Autenticacao necessaria." } as never);
    if (!(session.user as Record<string, unknown>).isAdmin) return reply.status(403).send({ message: "Acesso restrito a administradores." } as never);
    const { id } = request.params;
    await deleteBlock(id);
    return reply.status(204).send();
  });
};
