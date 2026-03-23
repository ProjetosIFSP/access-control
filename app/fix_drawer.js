const fs = require('fs');
const path = 'src/components/users/fingerprint-hand-drawer.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update type
content = content.replace(
    'type ActiveHandTab = "left" | "right";',
    'type ActiveHandTab = "left" | "right" | "nfc";'
);

// 2. Add Nfc Tab Import
if (!content.includes('NfcTab')) {
    content = content.replace(
        'import { FingerprintCaptureFeedback }',
        'import { NfcTab } from "./nfc-tab";\nimport { FingerprintCaptureFeedback }'
    );
}

// 3. Add NfcTags fetch to know the count
const fetchNfcTagsHook = `
const { data: nfcTags = [] } = useQuery({
...userNfcTagsQueryOptions(open ? userId : null),
});
`;
if (!content.includes('userNfcTagsQueryOptions')) {
    content = content.replace(
        'import {',
        'import { userNfcTagsQueryOptions } from "@/services/users/nfc-tags";\nimport {'
    );
    content = content.replace(
        'const { data: fingerprints = [], isLoading: isLoadingFingerprints }',
        fetchNfcTagsHook + '\n\tconst { data: fingerprints = [], isLoading: isLoadingFingerprints }'
    );
}

// 4. Update TABS
const tabConfigRegex = /const TABS = \[\s*\{ key: "left"[\s\S]*?\{ key: "right".*?\},?\s*\];/m;
const newTabConfig = `const TABS = [
{ key: "left" as const, label: "Mão Esquerda", count: leftCount },
{ key: "right" as const, label: "Mão Direita", count: rightCount },
{ key: "nfc" as const, label: "NFC", count: nfcTags.length },
];`;
content = content.replace(tabConfigRegex, newTabConfig);

// 5. Update header info
content = content.replace(
    /B\s*I\s*O\s*M\s*E\s*T\s*R\s*I\s*A/,
    'CREDENCIAS'
);
content = content.replace(
    /\{\s*leftCount \+ rightCount\s*\}\/10 digitais/,
    '{leftCount + rightCount}/10 digitais • {nfcTags.length}/5 NFC'
);

// 6. Update Content rendering
const handRenderRegex = /\{\/\* ── Hand region ── \*\/\}([\s\S]+?)\{\/\* ── Feedback region ── \*\/\}([\s\S]+?)<\/\div>\s*<\/motion\.div>/;

const newContent = `{/* ── Hand region ou NFC ── */}
<div className="flex-1 flex flex-col justify-end items-center relative py-4 min-h-[360px]">
{activeTab === "nfc" ? (
<div className="absolute inset-0 overflow-y-auto overflow-x-hidden pt-2">
<NfcTab user={{ id: userId, name: userName }} />
</div>
) : (
<Hand
side={activeTab}
fingerprints={fingerprints}
selectedFinger={selectedFinger}
interactive={true}
onFingerClick={handleFingerClick}
className="w-full h-full max-w-[280px] text-zinc-900 dark:text-zinc-50"
/>
)}
</div>
</div>

{/* ── Feedback region ── */}
{activeTab !== "nfc" && (
<div className="shrink-0 flex items-end">
<FingerprintCaptureFeedback
status={reader.status}
countdown={reader.countdown}
lastTemplate={reader.lastTemplate}
errorMessage={reader.errorMessage}
onConnect={reader.connect}
onDisconnect={reader.disconnect}
onRetry={reader.reset}
userName={userName}
/>
</div>
)}
</motion.div>`;

content = content.replace(handRenderRegex, newContent);

fs.writeFileSync(path, content, 'utf8');
