// Serves a directory of static files over HTTP on a free local port, the way
// a static host does: a directory answers with its index.html, and a path that
// is not a file answers 404.

import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

// Resolves to { url, close() }. Rejects when the directory has no index.html.
export async function serveDirectory(directory) {
  const root = path.resolve(directory);

  async function resolveFile(pathname) {
    const file = path.join(root, decodeURIComponent(pathname));
    if (file !== root && !file.startsWith(root + path.sep)) return null;
    try {
      return (await stat(file)).isDirectory() ? path.join(file, "index.html") : file;
    } catch {
      return null;
    }
  }

  try {
    await stat(path.join(root, "index.html"));
  } catch {
    throw new Error(`No index.html in ${root}. Run the build first.`);
  }

  const server = createServer(async (request, response) => {
    try {
      const file = await resolveFile(new URL(request.url, "http://localhost").pathname);
      const body = file && (await readFile(file));
      if (!body) throw new Error("not found");
      response.writeHead(200, {
        "content-type": CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  return {
    url: `http://127.0.0.1:${server.address().port}/`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  };
}
