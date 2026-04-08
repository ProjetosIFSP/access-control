import fs from 'fs';

const p = 'server/src/api/routes/user.ts';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
/200: z\.object\(\{\s+id: z\.string\(\)\.uuid\(\),\s+name: z\.string\(\),\s+email: z\.string\(\)\.email\(\),\s+image: z\.string\(\)\.nullable\(\),\s+isAdmin: z\.boolean\(\),\s+\}\),/g,
`200: z.object({
id: z.string().uuid(),
name: z.string(),
email: z.string().email(),
image: z.string().nullable(),
isAdmin: z.boolean(),
hasPassword: z.boolean(),
}),`
);

code = code.replace(
/const u = session\.user as Record<string, unknown>;\s+return reply\.status\(200\)\.send\(\{\s+id: u\.id as string,\s+name: u\.name as string,\s+email: u\.email as string,\s+image: \(u\.image as string\) \?\? null,\s+isAdmin: !!u\.isAdmin,\s+\}\);/,
`const dbAccounts = await db.select().from(account).where(eq(account.userId, session.user.id));
const hasPassword = dbAccounts.some((a) => a.password !== null && a.password !== undefined);

const u = session.user as Record<string, unknown>;
return reply.status(200).send({
id: u.id as string,
name: u.name as string,
email: u.email as string,
image: (u.image as string) ?? null,
isAdmin: !!u.isAdmin,
hasPassword,
});`
);

fs.writeFileSync(p, code);
