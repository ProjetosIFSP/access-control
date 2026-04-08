import fs from 'fs';
const p = 'src/routes/profile/index.tsx';
let code = fs.readFileSync(p, 'utf8');

// Replace duplicate occurrences
code = code.replace(/credentials:\s*"include",\n\s*credentials:\s*"include"/g, 'credentials: "include"');

fs.writeFileSync(p, code);
