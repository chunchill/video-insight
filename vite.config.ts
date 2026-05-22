import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { build as buildWithEsbuild } from "esbuild";

function classicContentScriptPlugin() {
  return {
    name: "classic-content-script",
    closeBundle: async () => {
      await buildWithEsbuild({
        entryPoints: [resolve(__dirname, "src/content/contentScript.ts")],
        outfile: resolve(__dirname, "dist/assets/contentScript.js"),
        bundle: true,
        format: "iife",
        platform: "browser",
        target: "chrome114"
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), classicContentScriptPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "src/sidepanel/sidepanel.html"),
        options: resolve(__dirname, "src/options/options.html"),
        background: resolve(__dirname, "src/background/background.ts")
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
});
