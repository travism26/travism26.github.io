// Page sources for the built-page checks.
//
// A page source is where a page and its local assets come from:
//   name             label used in test output
//   origin           the page's own origin, when it has one
//   html()           the HTML of the home page
//   asset(pathname)  the text of a local asset, or null when it does not resolve

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

// The build output directory, read from disk.
export function directorySource(directory) {
  const root = path.resolve(directory);

  async function read(pathname) {
    const file = path.join(root, decodeURIComponent(pathname));
    if (file !== root && !file.startsWith(root + path.sep)) return null;
    try {
      const target = (await stat(file)).isDirectory() ? path.join(file, "index.html") : file;
      return await readFile(target, "utf8");
    } catch {
      return null;
    }
  }

  return {
    name: root,
    async html() {
      const html = await read("/");
      if (html === null) throw new Error(`No index.html in ${root}. Run the build first.`);
      return html;
    },
    asset: read,
  };
}

// A served site, fetched over HTTP.
export function urlSource(baseUrl) {
  const base = new URL(baseUrl);

  return {
    name: base.href,
    origin: base.origin,
    async html() {
      const response = await fetch(base);
      if (!response.ok) throw new Error(`${base.href} answered ${response.status}`);
      return response.text();
    },
    async asset(pathname) {
      const response = await fetch(new URL(pathname, base));
      return response.ok ? response.text() : null;
    },
  };
}
