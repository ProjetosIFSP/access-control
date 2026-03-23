const fs = require('fs');
let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');

// Fix Tabs
const tabsRegex = /const TABS = \[\s*\{\s*key: "left"[\s\S]*?\{.*?key: "right"[\s\S]*?\},?\s*\];/;
const newTabs = `const TABS = [
{ key: "left" as const, label: "Mão Esquerda", count: leftCount },
{ key: "right" as const, label: "Mão Direita", count: rightCount },
{ key: "nfc" as const, label: "NFC", count: nfcTags.length },
];`;

if (tabsRegex.test(content)) {
    content = content.replace(tabsRegex, newTabs);
    console.log("Replaced TABS");
} else {
    console.log("Could not find TABS to replace");
}

// Fix duplicate badge label
// Look for "{leftCount + rightCount}/10 digitais • {nfcTags.length}/5" followed by arbitrary whitespace / newlines and "NFC" or whatever duplicate
const dupRegex = /\{leftCount \+ rightCount\}\/10 digitais\s*•\s*\{nfcTags\.length\}\/5\s*NFC\s*•\s*\{nfcTags\.length\}\/5\s*NFC/m;
const dupRegex2 = /\{leftCount \+ rightCount\}\/10 digitais\s*•\s*\{nfcTags\.length\}\/5\s*NFC\s*•\s*\{nfcTags\.length\}\/5/m;
const dupRegex3 = /\{leftCount \+ rightCount\}\/10 digitais(.*)\{nfcTags\.length\}\/5[\s\S]*NFC/g; // Catch all after digitais until NFC is done

// Let's just do a simpler search and replace for the exact span text
const exactSpanRegex = /<\s*span\s+className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 pb-1 shrink-0"\s*>[\s\S]*?<\/\s*span\s*>/;

const newSpan = `<span className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 pb-1 shrink-0">
{leftCount + rightCount}/10 digitais • {nfcTags.length}/5 NFC
</span>`;

if (exactSpanRegex.test(content)) {
    content = content.replace(exactSpanRegex, newSpan);
    console.log("Replaced Dup Label");
} else {
    console.log("Could not find Dup Label to replace");
}

// Add nfc as active tab type if missing (Wait, ActiveHandTab should be 'left' | 'right' | 'nfc' now)
// But to be sure:
const activeTabTypeRegex = /type ActiveHandTab = "left" \| "right";/;
if (activeTabTypeRegex.test(content)) {
    content = content.replace(activeTabTypeRegex, 'type ActiveHandTab = "left" | "right" | "nfc";');
    console.log("Replaced ActiveHandTab Type");
}

fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
