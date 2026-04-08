import fs from 'fs';
const p = 'app/src/routes/profile/index.tsx';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
/\<Input\s+type="password"\s+placeholder="Nova senha"\s+value=\{newPassword\}\s+onChange=\{\(e\) =>\s+setNewPassword\(e\.target\.value\)\s+\}\s+disabled=\{isLoadingPassword\}\s+\/\>/,
`<Input
type="password"
placeholder="Nova senha"
value={newPassword}
onChange={(e) => setNewPassword(e.target.value)}
disabled={isLoadingPassword}
/>
<Input
type="password"
placeholder="Confirme a senha"
value={confirmPassword}
onChange={(e) => setConfirmPassword(e.target.value)}
disabled={isLoadingPassword}
/>`
);

code = code.replace(
/if \(\(hasPassword && !currentPassword\) \|\| !newPassword\) \{/,
`if ((hasPassword && !currentPassword) || !newPassword || !confirmPassword) {`
);

code = code.replace(
/await authClient\.changePassword\(\{/g,
`if (newPassword !== confirmPassword) {
toast.warning("As senhas não coincidem.");
setIsLoadingPassword(false);
return;
}
await authClient.changePassword({`
);

code = code.replace(
/setNewPassword\(""\);/g,
`setNewPassword("");\n\t\t\tsetConfirmPassword("");`
);

fs.writeFileSync(p, code);
