const fs = require('fs');
let code = fs.readFileSync('server/src/api/routes/user.ts', 'utf8');

code = code.replace(/err instanceof NfcTagConflictError \|\|/g, "");
code = code.replace(/err instanceof NfcTagDuplicateTemplateError/g, "err instanceof NfcDuplicateError");
code = code.replace(/NfcTagNotFoundError/g, "NfcNotFoundError");
code = code.replace(/nfcTagSummarySchema/g, "nfcSummarySchema");

fs.writeFileSync('server/src/api/routes/user.ts', code);
