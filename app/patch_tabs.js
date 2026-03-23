const fs = require('fs');
let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');

// 1. Add nfc to type
content = content.replace(
    'type ActiveHandTab = "left" | "right";',
    'type ActiveHandTab = "left" | "right" | "nfc";'
);

// 2. Add nfc item to TABS
content = content.replace(
    /const TABS = \[\s*\{\s*id: "left",\s*label: "Mão Esquerda"\s*\},\s*\{\s*id: "right",\s*label: "Mão Direita"\s*\}\s*\] as const;/,
    'const TABS = [{ id: "left", label: "Mão Esquerda" }, { id: "right", label: "Mão Direita" }, { id: "nfc", label: "NFC" }] as const;'
);

// 3. Change header title
content = content.replace(
    '<span className="text-zinc-400 font-medium tracking-widest text-[11px] mb-2 px-6">',
    '<span className="text-zinc-400 font-medium tracking-widest text-[11px] mb-2 px-6">'
).replace(
    'BIOMETRIA',
    'CREDENCIAIS'
);

// 4. Import NfcTab & Nfc query (Optional Nfc query wasn't strictly necessary for rendering but good for badge if needed in drawer, though maybe we just don't need badge in drawer directly)
// NfcTab component handles its own queries for listing anyway! So just importing NfcTab is enough.
content = content.replace(
    "import { FingerprintCaptureFeedback } from \"./fingerprint-capture-feedback\";",
    "import { FingerprintCaptureFeedback } from \"./fingerprint-capture-feedback\";\nimport { NfcTab } from \"./nfc-tab\";"
);

fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
