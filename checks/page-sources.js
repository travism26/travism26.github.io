// Page sources for the built-page checks.
//
// A page source is where a page and its local assets come from:
//   name             label used in test output
//   origin           the page's own origin, when it has one
//   html()           the HTML of the home page
//   asset(pathname)  the text of a local asset, or null when it does not resolve
//   trackedFiles()   the tracked source the page was built from, as a list of
//                    { path, text }; only on sources that come with a checkout

import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const repository = fileURLToPath(new URL("..", import.meta.url));

// Every file git tracks in this repository, as it is in the working tree.
async function trackedFiles() {
  const { stdout } = await promisify(execFile)("git", ["ls-files", "-z"], { cwd: repository });
  const files = [];
  for (const tracked of stdout.split("\0").filter(Boolean)) {
    try {
      files.push({ path: tracked, text: await readFile(path.join(repository, tracked), "utf8") });
    } catch (error) {
      // A tracked file deleted from the working tree has nothing to read.
      if (error.code !== "ENOENT") throw error;
    }
  }
  return files;
}

// The build output directory, read from disk. It is built from this checkout.
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
    trackedFiles,
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
