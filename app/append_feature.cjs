const fs = require('fs');
let content = fs.readFileSync('../../.agents/features/implemented.md', 'utf8');

if (!content.includes('Leitura real via')) {
    content += '\n| CRED-002 (Fix) | Leitura mockada de NFC substitúida | Criado hook `use-nfc-reader` para modo teclado e vinculado ao botão do frontend para o ESP8266. |\n';
}

fs.writeFileSync('../../.agents/features/implemented.md', content, 'utf8');
