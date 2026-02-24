export default {
  input: './server/docs/openapi.yaml',
  output: {
    mode: 'single',
    target: './app/src/lib/api/generated.ts',
    schemas: './app/src/lib/api/schemas',
    client: 'custom',
    override: {
      mutator: {
        path: './mutator',
        name: 'mutator',
      },
    },
  },
};
