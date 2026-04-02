import { readFileSync, writeFileSync } from 'node:fs';

const path = '../app/src/routes/config/index.tsx';
let src = readFileSync(path, 'utf8');

const rx = /const filteredControllers = \(data\?\.controllers \?\? \[\]\)\.filter\(\s*\(c\) =>\s*c\.id\.toLowerCase\(\)\.includes\(searchQuery\.toLowerCase\(\)\) \|\|\s*\(c\.roomId\?\.toLowerCase\(\) \?\? ""\)\.includes\(searchQuery\.toLowerCase\(\)\),\s*\);/m;

const filteredControllersNew = `const filteredControllers = (data?.controllers ?? [])
.map((c) => {
const live = liveControllers[c.id];
if (live) {
return {
...c,
isOnline: true,
lastSeenAt: live.lastSeenAt,
roomId: live.roomId ?? c.roomId,
sensorProtocol: live.sensorProtocol ?? c.sensorProtocol
};
}
return c;
})
.map(c => {
const isActuallyOnline = (nowTick - new Date(c.lastSeenAt).getTime()) < 45000;
return { ...c, isOnline: isActuallyOnline };
})
.filter(
(c) =>
c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
(c.roomId?.toLowerCase() ?? "").includes(searchQuery.toLowerCase()),
);`;

src = src.replace(rx, filteredControllersNew);
writeFileSync(path, src);
