import fs from 'fs';
const p = 'src/api/routes/iot.ts';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
/import \{\s*DoorControllerNotFoundError,\s*RoomMismatchError,\s*registerDoorController,\s*updateDoorStatus,\s*\} from "@\/services\/iot\/door-controller";/g, 
\`import {
DoorControllerNotFoundError,
RoomMismatchError,
registerDoorController,
updateDoorStatus,
deleteDoorController,
} from "@/services/iot/door-controller";\`
);

code = code.replace(
/const \{ deleteDoorController \} = await import\(\s*"@\/services\/iot\/door-controller",?\s*\);/g, 
""
);

fs.writeFileSync(p, code);
