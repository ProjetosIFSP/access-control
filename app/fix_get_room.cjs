const fs = require('fs');
const filepath = '../server/src/services/room/get-room.ts';
let content = fs.readFileSync(filepath, 'utf8');

// replace the imports
if (!content.includes('roomType')) {
    content = content.replace('import { block, room } from "@/db/schema/room";', 'import { block, room, roomType } from "@/db/schema/room";');
}

// replace basequery
content = content.replace(
    /const baseQuery = db[\s\S]*?\.innerJoin\(block, eq\(block\.id, room\.blockId\)\);/g,
    `const baseQuery = db
\t\t.select()
\t\t.from(room)
\t\t.innerJoin(block, eq(block.id, room.blockId))
\t\t.innerJoin(roomType, eq(roomType.id, room.typeId));`
);

fs.writeFileSync(filepath, content, 'utf8');
