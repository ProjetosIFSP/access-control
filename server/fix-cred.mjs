import fs from 'fs';
const p = 'server/src/api/routes/credentials.ts';
let code = fs.readFileSync(p, 'utf8');
code = code.replace(/await requireAdmin\(request, reply\);/g, 'await requireAdmin(request, reply as unknown as import("@/lib/require-admin").GuardReply);');
fs.writeFileSync(p, code);
