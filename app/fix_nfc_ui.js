const fs = require('fs');
const path = '../app/src/components/users/users-table.tsx';
let content = fs.readFileSync(path, 'utf8');

const nfcBlock = `}
{user.nfcCount > 0 && (
<Tooltip>
<TooltipTrigger asChild>
<span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 cursor-default">
<Nfc className="size-3.5" />
{user.nfcCount}
</span>
</TooltipTrigger>
<TooltipContent side="left">
{user.nfcCount} {user.nfcCount === 1 ? "cartão NFC cadastrado" : "cartões NFC cadastrados"}
</TooltipContent>
</Tooltip>
)}`;

content = content.replace(/{user.fingerprintCount > 0 && \([\s\S]*?<\/Tooltip>\s*\)\s*}/g, match => match + "\n" + nfcBlock);

// Don't forget to import Nfc
if (!content.includes('Nfc')) {
    content = content.replace('Fingerprint,', 'Fingerprint, Nfc,');
}

fs.writeFileSync(path, content, 'utf8');
