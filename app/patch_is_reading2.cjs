const fs = require('fs');
let content = fs.readFileSync('src/components/users/nfc-tab.tsx', 'utf8');

const hookLine = "} = useNfcReader();";
content = content.replace(hookLine, hookLine + '\n\n\tconst isReading = readerStatus === "waiting" || readerStatus === "reading";');

fs.writeFileSync('src/components/users/nfc-tab.tsx', content, 'utf8');
