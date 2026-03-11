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
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/e2e/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // nuqs is hoisted to the workspace root (tcc/node_modules) but
      // @tanstack/react-router lives in app/node_modules. When esbuild
      // pre-bundles nuqs/adapters/tanstack-router it resolves imports
      // relative to the hoisted package location and cannot find the router.
      // This alias pins the resolution to the app-local copy for every
      // consumer, including esbuild during pre-bundling.
      "@tanstack/react-router": resolve(
        __dirname,
        "node_modules/@tanstack/react-router",
      ),
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
      "/api": {
        target: "http://localhost:3333",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
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
      // Both nuqs and its TanStack Router adapter must be pre-bundled together
      // so they share a single module instance of the internal React context.
      // The alias above ensures @tanstack/react-router resolves correctly from
      // app/node_modules during esbuild pre-bundling (nuqs is hoisted to the
      // workspace root where the router package does not exist).
      "nuqs",
      "nuqs/adapters/tanstack-router",
    ],
  },
});
