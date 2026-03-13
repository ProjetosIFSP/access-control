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
    entries: ["./src/**/*.{ts,tsx}"],
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
      "fumadocs-ui",
      "fumadocs-ui/layouts/docs",
      "fumadocs-ui/page",
      "fumadocs-ui/mdx",
      "fumadocs-ui/provider/tanstack",
      "fumadocs-ui/components/card",
      "fumadocs-core",
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
      // Outros pacotes UI
      "cmdk",
      "vaul",
      "sonner",
      "lucide-react",
      "nuqs",
    ],
  },
  ssr: {
    // Garante que fumadocs-mdx rode no Node.js sem ser bundlado para o cliente
    noExternal: ["fumadocs-core", "fumadocs-ui"],
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
