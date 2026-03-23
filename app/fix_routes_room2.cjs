const fs = require('fs');
const filepath = '../server/src/api/routes/room.ts';
let content = fs.readFileSync(filepath, 'utf8');

// Ensure the map function receives room_type properly
content = content.replace(
    /rooms\.result\.map\(\(\{\s*room,\s*block\s*/g,
    `rooms.result.map(({ room, block, room_type `
);

fs.writeFileSync(filepath, content, 'utf8');
