// Serves a directory of static files over HTTP on a free local port, the way
// a static host does: a directory answers with its index.html, and a path that
// is not a file answers 404.

import { createServer } from "node:http";
import path from "node:path";

import { buildOutput } from "../checks/build-output.js";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

// Resolves to { url, close() }. Rejects when the directory has no index.html.
// With no directory given, serves the one the build output module reads.
export async function serveDirectory(directory) {
  const output = buildOutput(directory);
  await output.home();

  const server = createServer(async (request, response) => {
    try {
      const found = await output.read(new URL(request.url, "http://localhost").pathname);
      if (!found) throw new Error("not found");
      response.writeHead(200, {
        "content-type": CONTENT_TYPES[path.extname(found.file)] ?? "application/octet-stream",
      });
      response.end(found.body);
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
