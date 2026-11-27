// The build output directory, read the way a static host serves it. The
// built-page checks and the smoke test's server both read it through here.
//
// With no directory given, it is the one CHECK_DIR names, or ./dist.

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export function buildOutput(directory = process.env.CHECK_DIR ?? "dist") {
  const root = path.resolve(directory);

  // The file a URL path names, as { file, body }, or null when it names none.
  // A directory answers with its index.html, and nothing outside the
  // directory is ever read.
  async function read(pathname) {
    try {
      const named = path.join(root, decodeURIComponent(pathname));
      if (named !== root && !named.startsWith(root + path.sep)) return null;
      const file = (await stat(named)).isDirectory() ? path.join(named, "index.html") : named;
      return { file, body: await readFile(file) };
    } catch {
      return null;
    }
  }

  // The home page, as { file, body }. Rejects when the directory has none.
  async function home() {
    const page = await read("/");
    if (!page) throw new Error(`No index.html in ${root}. Run the build first.`);
    return page;
  }

  return { root, read, home };
}
