import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { db } from "@/db";
import { accessCredential, accessLog } from "@/db/schema/access";
import { user } from "@/db/schema/auth";
import { type GuardReply, requireAdmin } from "@/lib/require-admin";
import { z } from "@/lib/zod";
import { deleteNfcTag } from "@/services/user/nfc/delete-nfc";

const nfcSummarySchema = z.object({
id: z.string().uuid(),
value: z.string(),
isActive: z.boolean(),
createdAt: z.string().datetime(),
user: z
.object({
id: z.string().uuid(),
name: z.string(),
})
.nullable(),
lastUsage: z.string().datetime().nullable(),
});

export const credentialsRoute: FastifyPluginAsyncZod = async (app) => {
app.get(
"/nfc",
{
schema: {
tags: ["credentials"],
summary: "Listar todas as credenciais NFC",
description: "Retorna as credenciais NFC cadastradas com seu usuário e último uso.",
security: [{ sessionCookie: [] }],
querystring: z.object({
q: z.string().optional(),
page: z.coerce.number().min(1).default(1),
pageSize: z.coerce.number().min(1).max(100).default(20),
}),
response: {
200: z.object({
result: z.array(nfcSummarySchema),
total: z.number(),
page: z.number(),
pageSize: z.number(),
totalPages: z.number(),
}),
},
},
},
async (request, reply) => {
await requireAdmin(request, reply as unknown as import("@/lib/require-admin").GuardReply);
const { q, page, pageSize } = request.query;
const offset = (page - 1) * pageSize;

const whereClause = and(
eq(accessCredential.type, "NFC_TAG"),
q
? or(
ilike(accessCredential.value, `%${q}%`),
ilike(user.name, `%${q}%`),
)
: undefined,
);

const [{ count }] = await db
.select({ count: sql`count(*)`.mapWith(Number) })
.from(accessCredential)
.leftJoin(user, eq(accessCredential.userId, user.id))
.where(whereClause);

const totalPages = Math.ceil(count / pageSize) || 1;

const rows = await db
.select({
id: accessCredential.id,
value: accessCredential.value,
isActive: accessCredential.isActive,
createdAt: accessCredential.createdAt,
userId: user.id,
userName: user.name,
// Pegando a data da última tentativa de acesso dessa credencial
// Mesmo se falhou, o acesso pode ter sido registrado
lastUsage: sql`(
SELECT timestamp
FROM ${accessLog}
WHERE access_credential_id = ${accessCredential.id}
ORDER BY timestamp DESC
LIMIT 1
)`.mapWith(String),
})
.from(accessCredential)
.leftJoin(user, eq(accessCredential.userId, user.id))
.where(whereClause)
.limit(pageSize)
.offset(offset)
.orderBy(desc(accessCredential.createdAt));

return reply.send({
result: rows.map((r) => ({
id: r.id,
value: r.value,
isActive: r.isActive,
createdAt: r.createdAt.toISOString(),
user: r.userId ? { id: r.userId, name: r.userName! } : null,
lastUsage: r.lastUsage ? new Date(r.lastUsage).toISOString() : null,
})),
total: count,
page,
pageSize,
totalPages,
});
},
);

app.delete(
"/nfc/:id",
{
schema: {
tags: ["credentials"],
summary: "Remover credencial NFC",
security: [{ sessionCookie: [] }],
params: z.object({
id: z.string().uuid(),
}),
response: {
204: z.null(),
},
},
},
async (request, reply) => {
await requireAdmin(request, reply as unknown as import("@/lib/require-admin").GuardReply);
const { id } = request.params;

const [cred] = await db
.select({ userId: accessCredential.userId })
.from(accessCredential)
.where(eq(accessCredential.id, id));

if (!cred) {
return (reply as unknown as GuardReply).status(404).send({ message: "Credencial não encontrada." });
}

await deleteNfcTag(cred.userId, id);
return reply.status(204).send(null);
},
);
};
