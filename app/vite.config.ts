import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "fumadocs-mdx/vite";
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
