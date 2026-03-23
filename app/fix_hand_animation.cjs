const fs = require('fs');
const filepath = 'src/components/users/fingerprint-hand-drawer.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const oldStr = `<div className="flex flex-col gap-4">`;
const newStr = `<div key={activeTab} className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">`;

content = content.replace(oldStr, newStr);

fs.writeFileSync(filepath, content, 'utf8');
console.log("Feito.");
