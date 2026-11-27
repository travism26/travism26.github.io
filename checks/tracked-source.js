// The tracked source the built-page checks search: this repository's, wherever
// the page being checked comes from.

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const repository = fileURLToPath(new URL("..", import.meta.url));

// Every file git tracks in this repository, as it is in the working tree: a
// list of { path, text }.
export async function trackedFiles() {
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
