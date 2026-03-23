const fs = require('fs');
const filepath = '../server/src/api/routes/room.ts';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(
    /typeId: z\.string\(\)\.uuid\(\),/,
    `typeId: z.string().uuid(),
  typeAbbreviation: z.string().optional(),
  typeName: z.string().optional(),`
);

content = content.replace(
    /rooms = await getRooms/,
    `rooms = await getRooms`
);

content = content.replace(
    /const payload: z\.infer<typeof listRoomsResponseSchema> = {\n\s*result: rooms\.result\.map\(\(\{\s*room,\s*block\s*\}\) => \(\{/g,
    `const payload: z.infer<typeof listRoomsResponseSchema> = {
        result: rooms.result.map(({ room, block, room_type }) => ({`
);

content = content.replace(
    /\.\.\.room,\n\s*requiresBiometry/g,
    `...room,
            typeAbbreviation: room_type?.abbreviation,
            typeName: room_type?.name,
            requiresBiometry`
);

fs.writeFileSync(filepath, content, 'utf8');
