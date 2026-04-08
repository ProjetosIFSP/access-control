import fs from 'fs';
const p = 'src/routes/profile/index.tsx';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(/body: JSON.stringify\(\{ image: avatarPreview \}\),\s*credentials: "include",/g, "body: JSON.stringify({ image: avatarPreview }),");

fs.writeFileSync(p, code);
