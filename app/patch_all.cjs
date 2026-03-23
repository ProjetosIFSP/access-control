const fs = require('fs');
let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');

// 1. Types & Tabs
content = content.replace(
    'type ActiveHandTab = "left" | "right";',
    'type ActiveHandTab = "left" | "right" | "nfc";'
);
content = content.replace(
    /const TABS = \[\s*\{\s*id: "left",\s*label: "Mão Esquerda"\s*\},\s*\{\s*id: "right",\s*label: "Mão Direita"\s*\}\s*\] as const;/,
    'const TABS = [{ id: "left", label: "Mão Esquerda" }, { id: "right", label: "Mão Direita" }, { id: "nfc", label: "NFC" }] as const;'
);

// 2. Title
content = content.replace(
    'BIOMETRIA',
    'CREDENCIAIS'
);

// 3. Imports
if (!content.includes('NfcTab')) {
    content = content.replace(
        "import { FingerprintCaptureFeedback } from \"./fingerprint-capture-feedback\";",
        "import { FingerprintCaptureFeedback } from \"./fingerprint-capture-feedback\";\nimport { NfcTab } from \"./nfc-tab\";\nimport { userNfcTagsQueryOptions } from \"@/services/users/nfc-tags\";"
    );
}

// 4. Query
const anchorQuery = "const { data: fingerprints = [], isLoading: isLoadingFingerprints } =";
const newQuery = "const { data: nfcTags = [], isLoading: isLoadingNfcTags } = useQuery({\n\t\t\t...userNfcTagsQueryOptions(open ? userId : null),\n\t\t});\n\n\t\t" + anchorQuery;
if (!content.includes('isLoadingNfcTags')) {
    content = content.replace(anchorQuery, newQuery);
}

// 5. Render wrap (we might have already wrapped it but let's check)
if (!content.includes('activeTab === "nfc" ?')) {
    const anchor1 = '{/* Hand SVG — botões posicionados nas pontas dos dedos */}';
    const targetStart = content.indexOf(anchor1);

    const anchor2 = '</p>\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t)}';
    const targetEnd = content.indexOf(anchor2, targetStart) + anchor2.length;

    if (targetStart > -1 && targetEnd > -1) {
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
        console.error("Anchors for render not found");
    }
}

fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
console.log("All ok");
