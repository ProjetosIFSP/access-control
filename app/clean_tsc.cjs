const fs = require('fs');
let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');
content = content.replace("isLoading: isLoadingNfcTags }", "} ");
fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
