import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import * as MdxConfig from "./source.config";

const BACKEND_URL = "http://localhost:3333";

const config = defineConfig({
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    mdx(MdxConfig),
  ],
  optimizeDeps: {
    entries: [
      "./src/**/*.{ts,tsx}",
      // Inclui auth-client explicitamente para o Vite descobrir better-auth
      // antes da primeira requisição (evita re-otimização mid-render)
      "./src/lib/auth-client.ts",
      "./src/lib/auth.ts",
    ],
    // Pré-declara dependências UI para evitar re-otimização lazy na primeira
    // carga de uma rota — sem isso o Vite descobre os pacotes tarde demais,
    // reinicia o bundle e cria duas cópias do React ("Invalid hook call")
    include: [
      // Radix UI — componentes usados diretamente no código
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-select",
      "@radix-ui/react-slider",
      "@radix-ui/react-switch",
      "@radix-ui/react-tooltip",
      // Radix UI extras usados pelo fumadocs-ui internamente
      "@radix-ui/react-direction",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-popover",
      "@radix-ui/react-presence",
      "@radix-ui/react-tabs",
      "@radix-ui/react-scroll-area",
      // Radix UI barrel (usado via animate-ui)
      "radix-ui",
      // TanStack
      "@tanstack/react-table",
      "@tanstack/react-query",
      "@tanstack/react-query-devtools",
      "@tanstack/react-form",
      "@tanstack/router-core",
      "@tanstack/router-core/ssr/client",
      // Fumadocs — pré-carregados para evitar re-otimização ao entrar em /docs
      // Nota: "fumadocs-ui" e "fumadocs-core" não têm entry "." — usar apenas sub-paths
      "fumadocs-ui/layouts/docs",
      "fumadocs-ui/page",
      "fumadocs-ui/mdx",
      "fumadocs-ui/provider/tanstack",
      "fumadocs-ui/components/card",
      "fumadocs-core/toc",
      "fumadocs-core/source",
      "fumadocs-core/page-tree",
      // Remark/rehype usados internamente pelo fumadocs no cliente
      "rehype-raw",
      "remark",
      "remark-rehype",
      "unist-util-visit",
      "hast-util-to-jsx-runtime",
      "vfile",
      "scroll-into-view-if-needed",
      // better-auth deps com CJS ou sub-paths usados no cliente — podem entrar
      // no optimizeDeps normalmente. Os pacotes ESM-only (better-auth,
      // @better-auth/core, nanostores, @noble/*, jose) são tratados via
      // ssr.noExternal abaixo e NÃO devem aparecer aqui.
      "@better-fetch/fetch",
      "defu",
      // better-call tem CJS mas sub-paths como /error são descobertos tarde
      "better-call/error",
      // Outros pacotes UI
      "cmdk",
      "vaul",
      "sonner",
      "lucide-react",
      "nuqs",
    ],
  },
  ssr: {
    // Força bundling SSR para pacotes ESM-only que o Vite marcaria como
    // external automaticamente. Sem isso o cliente recebe módulos ES não
    // resolvidos e dispara re-otimização mid-render ("Invalid hook call").
    noExternal: [
      // Fumadocs
      "fumadocs-core",
      "fumadocs-ui",
      // better-auth e toda a árvore de dependências ESM-only transitivas.
      // Verificado via package.json: type=module sem export require/node.
      "better-auth",
      "@better-auth/core",
      "nanostores",
      "@noble/ciphers",
      "@noble/hashes",
      "jose",
    ],
  },
  server: {
    proxy: {
      "/auth": {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      "/api": {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
});

export default config;
