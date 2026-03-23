const fs = require('fs');

let content = fs.readFileSync('src/components/users/nfc-tab.tsx', 'utf8');

const isReadingLine = 'const isReading = readerStatus === "waiting" || readerStatus === "reading";\n\tconst [deleteId, setDeleteId] = useState<string | null>(null);';

content = content.replace(isReadingLine, 'const [deleteId, setDeleteId] = useState<string | null>(null);');

const nfcReaderLine = 'const { status: readerStatus, lastUid, startCapture, cancelCapture } = useNfcReader();';

// insert it right below useNfcReader
content = content.replace(nfcReaderLine, nfcReaderLine + '\n\tconst isReading = readerStatus === "waiting" || readerStatus === "reading";');

fs.writeFileSync('src/components/users/nfc-tab.tsx', content, 'utf8');
