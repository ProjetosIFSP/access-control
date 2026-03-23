const fs = require('fs');
const filepath = 'src/components/users/fingerprint-hand-drawer.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const oldStr = `                                                                \t\t\t<span className="text-4xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50 leading-none truncate">\n                                                                \t\t\t\t{userName}\n                                                                \t\t\t</span>\n                                                                \t\t\t<span className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 pb-1 shrink-0">\n                                                                \t\t\t\t{leftCount + rightCount}/10 digitais • {nfcTags.length}/5\n                                                                \t\t\t\tNFC\n                                                                \t\t\t</span>`;

const regex = /<span className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 pb-1 shrink-0">[\s\S]*?<\/span>/g;

content = content.replace(regex, "");

fs.writeFileSync(filepath, content, 'utf8');
console.log("Feito.");
