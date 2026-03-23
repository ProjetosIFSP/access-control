const fs = require('fs');

let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');

content = content.replace(
    /type ActiveHandTab = "left" \| "right";/g,
    'type ActiveHandTab = "left" | "right" | "nfc";'
);

content = content.replace(
    /import { FingerprintCaptureFeedback } from "\.\/fingerprint-capture-feedback";/g,
    `import { FingerprintCaptureFeedback } from "./fingerprint-capture-feedback";
import { NfcTab } from "./nfc-tab";
import { userNfcTagsQueryOptions } from "@/services/users/nfc-tags";`
);

content = content.replace(
    /const \{ data: fingerprints = \[\], isLoading: isLoadingFingerprints \} =/g,
    `const { data: nfcTags = [] } = useQuery({ ...userNfcTagsQueryOptions(open ? userId : null) });
const { data: fingerprints = [], isLoading: isLoadingFingerprints } =`
);

const oldTabsText = `const TABS = [
{ key: "left" as const, label: "Mão Esquerda", count: leftCount },
{ key: "right" as const, label: "Mão Direita", count: rightCount },
];`;
const newTabsText = `const TABS = [
{ key: "left" as const, label: "Mão Esquerda", count: leftCount },
{ key: "right" as const, label: "Mão Direita", count: rightCount },
{ key: "nfc" as const, label: "NFC", count: nfcTags.length },
];`;
content = content.replace(oldTabsText, newTabsText);

content = content.replace(
    />BIOMETRIA</g,
    '>CREDENCIAIS<'
);

content = content.replace(
    '10 digitais',
    '10 digitais • {nfcTags.length}/5 NFC'
);

const renderOld = `{/* Hand SVG — botões posicionados nas pontas dos dedos */}
<div className="flex justify-center">
{isLoadingFingerprints ? (
<div className="h-[432px] w-[342px] flex items-center justify-center">
<Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
</div>
) : (
<Hand
side={activeTab}
fingerprints={fingerprints}
selectedFinger={selectedFinger}
onFingerSelect={setSelectedFinger}
/>
)}
</div>

{/* Status/Feedback Area */}
<div className="mt-8 flex justify-center">
<FingerprintCaptureFeedback
reader={reader}
selectedFinger={selectedFinger}
mutation={registerMutation}
onCancel={() => setSelectedFinger(null)}
/>
</div>`;

const renderNew = `{activeTab === "nfc" ? (
<div className="absolute inset-x-0 inset-y-0 overflow-y-auto mt-2 pb-16 custom-scrollbar">
<NfcTab user={{ id: userId, name: userName }} />
</div>
) : (
<div className="flex flex-col">
{/* Hand SVG — botões posicionados nas pontas dos dedos */}
<div className="flex justify-center">
{isLoadingFingerprints ? (
<div className="h-[432px] w-[342px] flex items-center justify-center">
<Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
</div>
) : (
<Hand
side={activeTab}
fingerprints={fingerprints}
selectedFinger={selectedFinger}
onFingerSelect={setSelectedFinger}
/>
)}
</div>

{/* Status/Feedback Area */}
<div className="mt-8 flex justify-center mb-10 pb-8">
<FingerprintCaptureFeedback
reader={reader}
selectedFinger={selectedFinger}
mutation={registerMutation}
onCancel={() => setSelectedFinger(null)}
/>
</div>
</div>
)}`;

if (content.includes("botões posicionados nas pontas dos dedos")) {
    content = content.replace(renderOld, renderNew);
} else {
    console.error("COULD NOT FIND RENDER");
}

fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
console.log("Patched!");
