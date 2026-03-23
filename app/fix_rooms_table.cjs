const fs = require('fs');
const filepath = 'src/components/rooms-admin/rooms-table.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// Replace DoorStateBadge
const doorStateRegex = /function DoorStateBadge\(\{ state \}: \{ state: string \}\) \{[\s\S]*?return \([\s\S]*?\);\n\}/;

const newDoorStateBadge = `function DoorStateBadge({ state }: { state: string }) {
\tconst normalized = state?.toUpperCase();
\t
\tlet colorClass = "bg-destructive";
\tlet title = state || "Desconhecido";

\tif (normalized === "OPEN" || normalized === "OPENED") {
\t\tcolorClass = "bg-primary";
\t\ttitle = "Aberta";
\t} else if (normalized === "CLOSED") {
\t\tcolorClass = "bg-zinc-400 dark:bg-zinc-600";
\t\ttitle = "Fechada";
\t} else if (!state || normalized === "UNKNOWN") {
\t\tcolorClass = "bg-zinc-300 dark:bg-zinc-700";
\t\ttitle = "Desconhecido";
\t}

\treturn (
\t\t<div
\t\t\tclassName={cn("size-2.5 rounded-full", colorClass)}
\t\t\ttitle={title}
\t\t/>
\t);
}`;

content = content.replace(doorStateRegex, newDoorStateBadge);

// Ensure cn is imported
if (!content.includes('import { cn }')) {
    content = content.replace('import { Badge } from "@/components/ui/badge";', 'import { Badge } from "@/components/ui/badge";\nimport { cn } from "@/lib/utils";');
}

// Update the Cell
const tableCellRegex = /<div className="flex flex-col gap-0\.5">[\s\S]*?<\/div>\s*<\/TableCell>/;

const newTableCell = `<div className="flex flex-col gap-0.5">
\t\t\t\t\t\t\t\t\t\t<div className="flex items-center gap-2">
\t\t\t\t\t\t\t\t\t\t\t<span className="font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
\t\t\t\t\t\t\t\t\t\t\t\t{room.name}
\t\t\t\t\t\t\t\t\t\t\t</span>
\t\t\t\t\t\t\t\t\t\t\t<DoorStateBadge state={room.doorState} />
\t\t\t\t\t\t\t\t\t\t\t{room.typeAbbreviation && (
\t\t\t\t\t\t\t\t\t\t\t\t<Badge variant="secondary" className="py-0 px-1 text-[10px] whitespace-nowrap h-5">
\t\t\t\t\t\t\t\t\t\t\t\t\t{room.typeAbbreviation}
\t\t\t\t\t\t\t\t\t\t\t\t</Badge>
\t\t\t\t\t\t\t\t\t\t\t)}
\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t\t<div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 leading-tight">
\t\t\t\t\t\t\t\t\t\t\t<span>{room.blockName || "—"}</span>
\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t</TableCell>`;

content = content.replace(tableCellRegex, newTableCell);

fs.writeFileSync(filepath, content, 'utf8');
console.log("Feito.");
