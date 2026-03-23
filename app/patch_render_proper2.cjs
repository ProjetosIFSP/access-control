const fs = require('fs');
let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');

const startStr = '{/* Hand SVG — botões posicionados nas pontas dos dedos */}';
const targetStart = content.indexOf(startStr);

// We can just find 'Toque em um dedo para iniciar o cadastro'
const midStr = 'Toque em um dedo para iniciar o cadastro';
const midIndex = content.indexOf(midStr);

// Now find the NEXT closing parenthesis and brace `)}` after midIndex
const targetEnd = content.indexOf(')}', midIndex) + 2;

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
    fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
    console.log("SUCCESS!");
} else {
    console.error("FAIL", {targetStart, targetEnd});
}
