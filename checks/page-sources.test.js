// Proves what the page sources say about tracked source.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { directorySource, urlSource } from "./page-sources.js";

test("the directory source comes with the repository's tracked files as they are on disk", async () => {
  const files = await directorySource("dist").trackedFiles();
  const paths = files.map((file) => file.path);
  assert.ok(paths.includes("src/data.js"), "src/data.js is tracked");
  assert.ok(paths.includes("checks/page-sources.test.js"), "this file is tracked");
  assert.ok(!paths.some((path) => path.startsWith("dist/") || path.startsWith("node_modules/")));

  const thisFile = files.find((file) => file.path === "checks/page-sources.test.js");
  assert.equal(thisFile.text, await readFile(new URL(import.meta.url), "utf8"));
});

test("a served site comes with no tracked source", () => {
  assert.equal(urlSource("https://site.example/").trackedFiles, undefined);
});
