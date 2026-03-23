const fs = require('fs');

let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');

const regex = /<div className="absolute inset-x-0 inset-y-0 overflow-y-auto px-4 pt-4 custom-scrollbar">/g;

content = content.replace(regex, '<div className="w-full custom-scrollbar pb-16">');

fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
