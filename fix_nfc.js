const fs = require('fs');
let code = fs.readFileSync('nfc_routes.txt', 'utf8');

code = code.replace(/value: r.value as \(typeof FINGER_KEYS\)\[number\],\n/g, "");
code = code.replace(/value: valueKeySchema,\n/g, "");
code = code.replace(/valueKeySchema/g, "z.string()");
code = code.replace(/Máximo de 1 por dedo./g, "Apenas cartões únicos.");
code = code.replace(/impressão /g, "");

fs.writeFileSync('nfc_routes.txt', code);
