import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base: "./" makes all asset URLs relative, so the built deck works at ANY path —
// the repo root, a GitHub Pages project subpath (you.github.io/<repo>/), or a
// custom domain — without per-repo configuration. Navigation uses the URL hash,
// so no server-side SPA fallback is required on GitHub Pages.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
