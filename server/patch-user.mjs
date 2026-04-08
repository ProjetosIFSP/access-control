import fs from 'fs';
const code = fs.readFileSync('src/api/routes/user.ts', 'utf8');
if (!code.includes('/me/password')) {
  const insertIndex = code.indexOf('// GET /users?q=');
  const inject = `
// POST /users/me/password
app.post(
"/me/password",
{
schema: {
tags: ["users"],
summary: "Atualizar ou criar senha",
security: [{ sessionCookie: [] }],
body: z.object({
currentPassword: z.string().optional(),
newPassword: z.string().min(8),
}),
response: {
200: z.object({ success: z.boolean() }),
400: z.object({ message: z.string() }),
401: z.object({ message: z.string() }),
500: z.object({ message: z.string() }),
},
},
},
async (request, reply) => {
const session = await resolveSession(request);
if (!session?.user) {
return (reply as unknown as GuardReply)
.status(401)
.send({ message: "Autenticação necessária." });
}

const { currentPassword, newPassword } = request.body;

const dbAccounts = await db
.select()
.from(account)
.where(eq(account.userId, session.user.id));

const credentialAccount = dbAccounts.find((a) => a.providerId === "credential" || !!a.password);

const { hashPassword, verifyPassword } = await import("better-auth/crypto");

if (credentialAccount) {
if (!currentPassword) {
return reply.status(400).send({ message: "Senha atual é obrigatória" });
}
const isValid = await verifyPassword({ hash: credentialAccount.password || "", password: currentPassword });
if (!isValid) {
return reply.status(400).send({ message: "Senha atual incorreta" });
}
const newHash = await hashPassword(newPassword);
await db.update(account).set({ password: newHash }).where(eq(account.id, credentialAccount.id));
} else {
const newHash = await hashPassword(newPassword);
const { randomUUID } = await import("crypto");
await db.insert(account).values({
id: randomUUID(),
userId: session.user.id,
accountId: session.user.id,
providerId: "credential",
password: newHash,
createdAt: new Date(),
updatedAt: new Date(),
});
}

return reply.status(200).send({ success: true });
},
);
`;
  fs.writeFileSync('src/api/routes/user.ts', code.slice(0, insertIndex) + inject + code.slice(insertIndex));
  console.log("Patched user routes");
}
