const fs = require('fs');
let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');

const anchor = "const { data: fingerprints = [], isLoading: isLoadingFingerprints } =";
const newContent = "const { data: nfcTags = [], isLoading: isLoadingNfcTags } = useQuery({\n\t\t\t...userNfcTagsQueryOptions(open ? userId : null),\n\t\t});\n\n\t\t" + anchor;

content = content.replace(anchor, newContent);

fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
console.log("Did it work?", content.includes("isLoadingNfcTags"));
