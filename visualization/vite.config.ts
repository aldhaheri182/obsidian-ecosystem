import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// M0 Owner Observatory — single-city (Aletheia) view of the running ecosystem.
export default defineConfig({
  plugins: [svelte()],
  server: { host: "0.0.0.0", port: 5173 },
  build: { target: "esnext", outDir: "dist", sourcemap: true },
});
