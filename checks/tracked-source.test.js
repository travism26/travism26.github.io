// Proves that the tracked source the checks search is this repository's.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { trackedFiles } from "./tracked-source.js";

test("the tracked source is the repository's tracked files as they are on disk", async () => {
  const files = await trackedFiles();
  const paths = files.map((file) => file.path);
  assert.ok(paths.includes("src/data.js"), "src/data.js is tracked");
  assert.ok(paths.includes("checks/tracked-source.test.js"), "this file is tracked");
  assert.ok(!paths.some((path) => path.startsWith("dist/") || path.startsWith("node_modules/")));

  const thisFile = files.find((file) => file.path === "checks/tracked-source.test.js");
  assert.equal(thisFile.text, await readFile(new URL(import.meta.url), "utf8"));
});
