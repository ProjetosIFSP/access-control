const fs = require('fs');

let content = fs.readFileSync('src/components/users/nfc-tab.tsx', 'utf8');

// replace mock function
const mockFuncRegex = /const handleReadNfc = \(\) => \{[\s\S]*?\};\n/m;
const mockFuncStr = 
`const { status: readerStatus, lastUid, startCapture, cancelCapture } = useNfcReader();

    // Quando o UID é lido com sucesso, cadastra
    useEffect(() => {
        if (readerStatus === "success" && lastUid) {
            registerMutation.mutate({ userId: user.id, value: lastUid });
            cancelCapture();
        }
    }, [readerStatus, lastUid, registerMutation, user.id, cancelCapture]);

    const handleReadNfc = () => {
        startCapture();
    };

    const handleCancelRead = () => {
        cancelCapture();
    };

`;

content = content.replace(mockFuncRegex, mockFuncStr);

// add imports
content = content.replace(
    'import { useState } from "react";',
    'import { useState, useEffect } from "react";\nimport { useNfcReader } from "@/hooks/use-nfc-reader";'
);

// replace isReading checks in the UI with readerStatus checks
// const [isReading, setIsReading] = useState(false); => Remove
content = content.replace('const [isReading, setIsReading] = useState(false);', '');
content = content.replace(/setIsReading\(false\);/g, '');


// isReading boolean check replacement
// Wait, isReading is used mostly natively... let's just make a boolean:
// const isReading = readerStatus === "waiting" || readerStatus === "reading";
content = content.replace(
    /const \[deleteId/g,
    'const isReading = readerStatus === "waiting" || readerStatus === "reading";\n    const [deleteId'
);

// add cancel button right after Ler Cartao NFC or swap it
const btnRegex = /<Button[\s\S]*?onClick=\{handleReadNfc\}[\s\S]*?>[\s\S]*?<\/Button>/;

const newBtn = `{!isReading ? (
                <Button
                    size="lg"
                    className="w-full max-w-[200px]"
                    disabled={registerMutation.isPending}
                    onClick={handleReadNfc}
                >
                    Ler Cartão NFC
                </Button>
            ) : (
                <Button
                    size="lg"
                    variant="secondary"
                    className="w-full max-w-[200px]"
                    onClick={handleCancelRead}
                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aguardando leitura... (Cancelar)
                </Button>
            )}`;

if (btnRegex.test(content)) {
    content = content.replace(btnRegex, newBtn);
    fs.writeFileSync('src/components/users/nfc-tab.tsx', content, 'utf8');
    console.log("Patched nfc-tab.tsx 1");
} else {
    console.log("Failed to patch nfc-tab button");
}

