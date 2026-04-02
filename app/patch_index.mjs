import { readFileSync, writeFileSync } from 'node:fs';

const path = '../app/src/routes/rooms/index.tsx';
let src = readFileSync(path, 'utf8');

// Add import for useControllerStream
if (!src.includes('useControllerStream')) {
  src = src.replace('import { useQuery, useQueryClient } from "@tanstack/react-query";', 'import { useQuery, useQueryClient } from "@tanstack/react-query";\nimport { useControllerStream } from "@/hooks/use-controller-stream";');
  
  if (!src.includes('useControllerStream')) { // fallback
    src = src.replace('import { useCallback, useEffect, useMemo, useRef, useState } from "react";', 'import { useCallback, useEffect, useMemo, useRef, useState } from "react";\nimport { useControllerStream } from "@/hooks/use-controller-stream";');
  }
}

// Add hook
if (!src.includes('const liveControllers')) {
  src = src.replace('const { data: controllerTargetsData } = useQuery(', 'const liveControllers = useControllerStream();\n\tconst { data: controllerTargetsData } = useQuery(');
  src = src.replace('const [panelMode, setPanelMode]', 'const [nowTick, setNowTick] = useState(() => Date.now());\n\tuseEffect(() => { const timer = setInterval(() => setNowTick(Date.now()), 15000); return () => clearInterval(timer); }, []);\n\n\tconst [panelMode, setPanelMode]');
}

// Update controllerOptions logic
const controllerOptionsRegex = /const controllerOptions = useMemo\(\(\) => \{[\s\S]*?return \[\.\.\.pairing, \.\.\.roomAssigned\];\s*\}, \[controllerTargetsData, panelMode\]\);/;

const newControllerOptions = `const controllerOptions = useMemo(() => {
const isOnline = (controllerId: string, lastSeenAt: string) => {
// Check if live event came
if (liveControllers[controllerId]?.lastSeenAt) {
return (nowTick - new Date(liveControllers[controllerId].lastSeenAt).getTime()) < 45000;
}
return (nowTick - new Date(lastSeenAt).getTime()) < 45000;
};

const pairing = (controllerTargetsData?.pairingControllers ?? [])
.filter(c => isOnline(c.controllerId, c.lastSeenAt))
.map((controller) => ({
controllerId: controller.controllerId,
label: \`\${controller.controllerId} (pareamento)\`,
group: "pairing" as const,
}));

const roomAssigned = (controllerTargetsData?.roomControllers ?? [])
.filter((controller) => {
if (panelMode.kind !== "editRoom") return false;
return controller.roomId === panelMode.item.id;
})
.map((controller) => ({
controllerId: controller.controllerId,
label: \`\${controller.controllerId} (\${controller.roomName})\` + (isOnline(controller.controllerId, controller.lastSeenAt) ? " - Online" : " - Offline"),
group: "room" as const,
}));

return [...pairing, ...roomAssigned];
}, [controllerTargetsData, panelMode, liveControllers, nowTick]);`;

src = src.replace(controllerOptionsRegex, newControllerOptions);

writeFileSync(path, src);
