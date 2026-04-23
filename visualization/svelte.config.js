// Minimal Svelte config. M0 doesn't use any .svelte components (the UI is
// plain DOM plus a PixiJS canvas), but the plugin is wired for future use.
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
};
