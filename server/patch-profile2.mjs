import fs from 'fs';
const p = '../app/src/routes/profile/index.tsx';
let code = fs.readFileSync(p, 'utf8');

if (code.includes('const { error } = await authClient.changePassword({')) {
code = code.replace(
/if \(!hasPassword\) \{[\s\S]*?\} else \{[\s\S]*?if \(error\) throw new Error\(error\.message\);\s*\}/,
`const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:3333") + "/users/me/password", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ currentPassword: currentPassword || undefined, newPassword }),
credentials: "include"
});

if (!res.ok) {
const data = await res.json().catch(() => ({}));
throw new Error(data.message || "Falha ao atualizar a senha");
}`
);
} else if (code.includes('/users/me/password')) {
code = code.replace(
/headers: \{ "Content-Type": "application\/json" \},/,
`headers: { "Content-Type": "application/json" },
credentials: "include",`
);
}

fs.writeFileSync(p, code);
console.log("Patched profile credentials");
