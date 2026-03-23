const fs = require('fs');

let content = fs.readFileSync('src/components/users/fingerprint-hand-drawer.tsx', 'utf8');

const targetStr = '{activeTab === "nfc" ? (\n             <div className="absolute inset-x-0 inset-y-0 overflow-y-auto px-4 pt-4 custom-scrollbar">\n                  <NfcTab user={{ id: userId, name: userName }} />\n             </div>';

const newStr = '{activeTab === "nfc" ? (\n             <div className="w-full custom-scrollbar pb-16">\n                  <NfcTab user={{ id: userId, name: userName }} />\n             </div>';

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/users/fingerprint-hand-drawer.tsx', content, 'utf8');
