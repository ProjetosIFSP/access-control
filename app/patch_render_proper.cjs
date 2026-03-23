const fs = require('fs');
let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');

// 1. the imports
if(!content.includes('NfcTab')) {
    content = content.replace(
        'import { cn } from "@/lib/utils";',
        'import { cn } from "@/lib/utils";\nimport { NfcTab } from "./nfc-tab";\nimport { userNfcTagsQueryOptions } from "@/services/users/nfc-tags";'
    );
}

// 2. Use query for nfcTags
if (!content.includes('isLoadingNfcTags')) {
    content = content.replace(
        'const { data: fingerprints = [], isLoading: isLoadingFingerprints } =',
        'const { data: nfcTags = [], isLoading: isLoadingNfcTags } = useQuery({\n\t\t\t...userNfcTagsQueryOptions(open ? userId : null),\n\t\t});\n\n\t\tconst { data: fingerprints = [], isLoading: isLoadingFingerprints } ='
    );
}

// 3. TABS
const oldTabs = `const TABS = [
{ key: "left" as const, label: "Mão Esquerda", count: leftCount },
{ key: "right" as const, label: "Mão Direita", count: rightCount },
];`;
const newTabs = `const TABS = [
{ key: "left" as const, label: "Mão Esquerda", count: leftCount },
{ key: "right" as const, label: "Mão Direita", count: rightCount },
{ key: "nfc" as const, label: "NFC", count: nfcTags.length },
] as const;`;

content = content.replace(oldTabs, newTabs);

content = content.replace(
    /BIOMETRIA/g,
    'CREDENCIAIS'
);
content = content.replace(
    '{leftCount + rightCount}/10 digitais',
    '{leftCount + rightCount}/10 digitais • {nfcTags.length}/5 NFC'
);

// 4. Wrapping everything between `{/* Hand SVG` and `</p>\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t)}`

const startStr = '{/* Hand SVG — botões posicionados nas pontas dos dedos */}';
const targetStart = content.indexOf(startStr);

// Let's use string ends instead of guessing indent level
const endStr = 'Toque em um dedo para iniciar o cadastro\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t</p>\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t)}';
const targetEnd = content.indexOf(endStr) + endStr.length;

if (targetStart > -1 && targetEnd > targetStart && !content.includes('activeTab === "nfc" ?')) {
    const originalBody = content.substring(targetStart, targetEnd);
    const newBody = `{activeTab === "nfc" ? (
             <div className="absolute inset-x-0 inset-y-0 overflow-y-auto px-4 pt-4 custom-scrollbar">
                  <NfcTab user={{ id: userId, name: userName }} />
             </div>
        ) : (
            <div className="flex flex-col gap-4">
                 ${originalBody}
            </div>
        )}`;
    content = content.substring(0, targetStart) + newBody + content.substring(targetEnd);
} else {
    console.error("COULD NOT PATCH RENDER", {targetStart, targetEnd});
}

fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
console.log("PATCH COMPLETE");
