import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: './server/docs/openapi.yaml',
    output: {
      mode: 'single',
      target: './app/src/lib/api/generated.ts',
      schemas: './app/src/lib/api/schemas',
      client: 'axios',
      override: {
        mutator: {
          path: './app/src/lib/api/mutator.ts',
          name: 'mutator',
        },
      },
    },
  },
});
