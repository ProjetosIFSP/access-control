import fs from 'fs';
const p = '../app/src/routes/profile/index.tsx';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
/try \{\s*if \(!hasPassword\) \{\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*const \{ error \} = await authClient\.changePassword\(\{[\s\S]*?\}\);\s*if \(error\) throw new Error\(error\.message\);\s*\} else \{\s*const \{ error \} = await authClient\.changePassword\(\{[\s\S]*?\}\);\s*if \(error\) throw new Error\(error\.message\);\s*\}/g,
`try {
const res = await fetch(\`\${import.meta.env.VITE_API_URL || "http://localhost:3333"}/users/me/password\`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ currentPassword: currentPassword || undefined, newPassword }),
});

if (!res.ok) {
const data = await res.json().catch(() => ({}));
throw new Error(data.message || "Falha ao atualizar a senha");
}`
);

fs.writeFileSync(p, code);
console.log("Patched profile");
