import fs from 'fs';
const p = 'src/api/routes/iot.ts';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(/const\s*\{\s*deleteDoorController\s*\}\s*=\s*await\s*import\([\s\S]*?"@\/services\/iot\/door-controller"[\s\S]*?\);/m, "");

fs.writeFileSync(p, code);
