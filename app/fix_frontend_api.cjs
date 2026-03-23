const fs = require('fs');
const filepath = 'src/services/rooms/index.ts';
let content = fs.readFileSync(filepath, 'utf8');

const regex = /room: \{\s*id: string;\s*name: string;\s*blockId: string;\s*typeId: string;/;

const newString = "room: {\n\tid: string;\n\tname: string;\n\tblockId: string;\n\ttypeId: string;\n\ttypeAbbreviation?: string;\n\ttypeName?: string;";

content = content.replace(regex, newString);

const mapRegex = /result: data\.result\.map\(\(\{\s*room,\s*block\s*\}\) => \(\{\s*id: room\.id,\s*name: room\.name,\s*blockId: room\.blockId,\s*blockName: block\.name,\s*typeId: room\.typeId,/;

const mapNewString = "result: data.result.map(({ room, block }) => ({\n\tid: room.id,\n\tname: room.name,\n\tblockId: room.blockId,\n\tblockName: block.name,\n\ttypeId: room.typeId,\n\ttypeAbbreviation: room.typeAbbreviation || \"\",\n\ttypeName: room.typeName || \"\",";

content = content.replace(mapRegex, mapNewString);

fs.writeFileSync(filepath, content, 'utf8');
console.log("Feito.");
