const fs = require('fs');
let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');

const regex = /const \{ data: fingerprints = \[\], isLoading: isLoadingFingerprints \} =/;
const newQuery = `const { data: nfcTags = [], isLoading: isLoadingNfcTags } = useQuery({ ...userNfcTagsQueryOptions(open ? userId : null) });\n\tconst { data: fingerprints = [], isLoading: isLoadingFingerprints } =`;

if (!content.includes('isLoadingNfcTags') && regex.test(content)) {
    content = content.replace(regex, newQuery);
} else {
    console.error("Not replaced! includes nfc tags?", content.includes('isLoadingNfcTags'), "regex matches?", regex.test(content));
}

fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
