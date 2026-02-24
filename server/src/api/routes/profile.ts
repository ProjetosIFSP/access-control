import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "../../lib/zod";
import { getProfiles } from "@/services/profile/get-profiles";
import { createProfile } from "@/services/profile/create-profile";

const profileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  createdAt: z.string().datetime(),
});

const listProfilesResponse = z.object({ result: z.array(profileSchema) });

export const profileRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/",
    {
      schema: {
        tags: ["profiles"],
        summary: "Listar perfis",
        response: { 200: listProfilesResponse },
      },
    },
    async (_req, reply) => {
      const profiles = await getProfiles();
      const payload = {
        result: profiles.result.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
        })),
      };
      return reply.status(200).send(payload);
    },
  );

  app.post(
    "/",
    {
      schema: {
        tags: ["profiles"],
        summary: "Criar perfil",
        body: z.object({ name: z.string(), description: z.string().optional() }),
        response: { 201: profileSchema },
      },
    },
    async (request, reply) => {
      const { name, description } = request.body;
      const profile = await createProfile({ name, description });
      return reply.status(201).send({ ...profile, createdAt: profile.createdAt.toISOString() });
    },
  );

  app.post(
    "/:id/users",
    {
      schema: {
        tags: ["profiles"],
        summary: "Atribuir usuário a um perfil",
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ userId: z.string().uuid() }),
        response: { 204: z.void() },
      },
    },
    async (request, reply) => {
      const profileId = request.params.id as string;
      const { userId } = request.body as { userId: string };
      const { assignUserToProfile } = await import('@/services/profile/assign-user');
      await assignUserToProfile(userId, profileId);
      return reply.status(204).send();
    },
  );

  app.delete(
    "/:id/users/:userId",
    {
      schema: {
        tags: ["profiles"],
        summary: "Remover usuário de um perfil",
        params: z.object({ id: z.string().uuid(), userId: z.string().uuid() }),
        response: { 204: z.void() },
      },
    },
    async (request, reply) => {
      const { id: profileId, userId } = request.params as { id: string; userId: string };
      const { db } = await import('@/db');
      const { userProfile } = await import('@/db/schema/profile');
      await db.delete(userProfile).where(userProfile.userId.eq(userId).and(userProfile.profileId.eq(profileId))).run();
      return reply.status(204).send();
    },
  );
};
