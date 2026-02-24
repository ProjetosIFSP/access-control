const path = require('path');
module.exports = {
  input: path.join(__dirname, 'server/docs/openapi.yaml'),
  output: {
    mode: 'single',
    target: './app/src/lib/api/generated.ts',
    schemas: './app/src/lib/api/schemas',
    client: 'custom',
    override: {
      mutator: {
        // path is relative to the generated file location; mutator lives alongside generated.ts
        path: './mutator',
        name: 'mutator',
      },
    },
  },
};
