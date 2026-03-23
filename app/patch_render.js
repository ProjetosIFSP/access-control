const fs = require('fs');
let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');

const anchor1 = '{/* Hand SVG — botões posicionados nas pontas dos dedos */}';
const targetStart = content.indexOf(anchor1);

const anchor2 = '</p>\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t)}';
const targetEnd = content.indexOf(anchor2, targetStart) + anchor2.length;

if (targetStart > -1 && targetEnd > -1) {
    const originalBody = content.substring(targetStart, targetEnd);
    
    // We wrap originalBody with checking activeTab === "nfc"
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
    console.error("Anchors not found");
}

fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
