import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The site is served from the root of travism26.github.io, so the default
// base path ("/") and output directory ("dist") are the right ones.
export default defineConfig({
  plugins: [react()],
});
