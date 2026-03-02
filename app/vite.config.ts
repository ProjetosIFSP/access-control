import { defineConfig } from "vitest/config";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";

const rootDir = resolve(__dirname, "..");

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
  ],
  test: {
    globals: true,
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
    preserveSymlinks: true,
  },
  server: {
    fs: {
      allow: [rootDir],
    },
    proxy: {
      "/auth": {
        target: "http://localhost:3333",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // Tell Vite to also search root node_modules (npm workspaces hoisting)
    entries: ["./src/**/*.{ts,tsx}"],
    // Force pre-bundle packages that are discovered lazily (avoids 504 Outdated Optimize Dep)
    include: [
      "motion/react",
      "radix-ui",
      "better-auth/react",
      "sonner",
      "input-otp",
      "nanostores",
    ],
  },
});
