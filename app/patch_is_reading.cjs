const fs = require('fs');

let content = fs.readFileSync('src/components/users/nfc-tab.tsx', 'utf8');

const hookLine = 'const { status: readerStatus, lastUid, startCapture, cancelCapture } = useNfcReader();';

if (content.includes(hookLine) && !content.includes('const isReading =')) {
    content = content.replace(hookLine, hookLine + '\n\n\tconst isReading = readerStatus === "waiting" || readerStatus === "reading";\n');
} else {
    // maybe it's formatted differently
    content = content.replace(
        /cancelCapture;\n\t\}\);/m,
        'cancelCapture;\n\t});\n\n\tconst isReading = readerStatus === "waiting" || readerStatus === "reading";\n'
    );
}

fs.writeFileSync('src/components/users/nfc-tab.tsx', content, 'utf8');
