const fs = require('fs');
let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');

content = content.replace('type ActiveHandTab = "left" | "right";', 'type ActiveHandTab = "left" | "right" | "nfc";');

content = content.replace('import { FingerprintCaptureFeedback', 'import { NfcTab } from "./nfc-tab";\nimport { userNfcTagsQueryOptions } from "@/services/users/nfc-tags";\nimport { FingerprintCaptureFeedback');

content = content.replace(
    'const { data: fingerprints = [], isLoading: isLoadingFingerprints } =',
    'const { data: nfcTags = [] } = useQuery({\n\t\t\t...userNfcTagsQueryOptions(open ? userId : null),\n\t\t});\n\n\t\tconst { data: fingerprints = [], isLoading: isLoadingFingerprints } ='
);

content = content.replace(
    /const TABS = \[\s*\{\s*key: "left"[\s\S]*?\];/m,
    `const TABS = [
{ key: "left" as const, label: "Mão Esquerda", count: leftCount },
{ key: "right" as const, label: "Mão Direita", count: rightCount },
{ key: "nfc" as const, label: "Cartão NFC", count: nfcTags.length },
];`
);

content = content.replace(
    '<span className="text-xs font-black tracking-wider uppercase text-primary">\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tBIOMETRIA\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t</span>',
    '<span className="text-xs font-black tracking-wider uppercase text-primary">CREDENCIAIS</span>'
);

content = content.replace(
    '{leftCount + rightCount}/10 digitais',
    '{leftCount + rightCount}/10 digitais • {nfcTags.length}/5 NFC'
);

// Manual search and replace for hand block:
const handIndex = content.indexOf('{/* ── Hand region ── */}');
const feedbackIndex = content.indexOf('{/* ── Feedback region ── */}');
const feedbackEnd = content.indexOf('</motion.div>', feedbackIndex);

if (handIndex > -1 && feedbackIndex > -1) {
    const chunkBeforeHand = content.substring(0, handIndex);
    const chunkAfterFeedback = content.substring(feedbackEnd);

    const injected = `
    {/* ── Hand region ou NFC ── */}
    <div className="flex-1 flex flex-col justify-end items-center relative py-4 min-h-[360px]">
        {activeTab === "nfc" ? (
            <div className="absolute inset-x-0 inset-y-0 overflow-y-auto px-4 pt-2 -mx-6 custom-scrollbar flex flex-col gap-6">
                <NfcTab user={{ id: userId, name: userName }} />
            </div>
        ) : (
            <Hand
                side={activeTab as "left" | "right"}
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
`;

    content = chunkBeforeHand + injected + chunkAfterFeedback;
}

// Fixing type inference on Side in <Hand> component, since now ActiveHandTab can be 'nfc'

fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
