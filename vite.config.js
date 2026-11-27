import react from "@vitejs/plugin-react";
import { defineConfig, runnerImport } from "vite";

const EMPTY_ROOT = '<div id="root"></div>';

// Renders the application with React's server renderer and places the result
// inside the root element of index.html, in the build and on the dev server
// alike, so the HTML a client receives already holds the page content.
function prerender() {
  let config;
  return {
    name: "prerender",
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      order: "post",
      async handler(html) {
        if (!html.includes(EMPTY_ROOT)) {
          throw new Error(`index.html has no ${EMPTY_ROOT} to pre-render into`);
        }
        const { module } = await runnerImport("/src/prerender.jsx", { root: config.root, mode: config.mode });
        const rendered = module.render();
        return html.replace(EMPTY_ROOT, () => `<div id="root">${rendered}</div>`);
      },
    },
  };
}

// The site is served from the root of travism26.github.io, so the default
// base path ("/") and output directory ("dist") are the right ones.
export default defineConfig({
  plugins: [react(), prerender()],
});
