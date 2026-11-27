// Proves how a URL path is turned into a file of the build output.

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { buildOutput } from "./build-output.js";

let parent;
let directory;

before(async () => {
  parent = await mkdtemp(path.join(tmpdir(), "build-output-"));
  directory = path.join(parent, "site");
  await mkdir(path.join(directory, "assets"), { recursive: true });
  await mkdir(path.join(directory, "docs"));
  await writeFile(path.join(directory, "index.html"), "<h1>home</h1>");
  await writeFile(path.join(directory, "assets", "app one.js"), "app();");
  await writeFile(path.join(directory, "docs", "index.html"), "<h1>docs</h1>");
  await writeFile(path.join(parent, "outside.txt"), "not part of the site");
});

after(async () => {
  await rm(parent, { recursive: true, force: true });
});

test("a path that names a file answers with that file", async () => {
  const found = await buildOutput(directory).read("/assets/app%20one.js");
  assert.equal(found.file, path.join(directory, "assets", "app one.js"));
  assert.equal(found.body.toString("utf8"), "app();");
});

test("a path that names a directory answers with its index.html", async () => {
  const output = buildOutput(directory);
  assert.equal((await output.read("/")).body.toString("utf8"), "<h1>home</h1>");
  assert.equal((await output.read("/docs/")).file, path.join(directory, "docs", "index.html"));
});

test("a path that names nothing does not resolve", async () => {
  const output = buildOutput(directory);
  assert.equal(await output.read("/assets/missing.js"), null);
  assert.equal(await output.read("/assets/"), null);
  assert.equal(await output.read("/%E0%A4%A"), null);
});

test("a path that climbs out of the directory does not resolve", async () => {
  const output = buildOutput(directory);
  assert.equal(await output.read("/../outside.txt"), null);
  assert.equal(await output.read("/%2e%2e/outside.txt"), null);
  assert.equal(await output.read("/assets/../../outside.txt"), null);
});

test("the home page of a directory that has none is an error that says to build first", async () => {
  await assert.rejects(buildOutput(path.join(directory, "assets")).home(), /No index\.html in .*assets\. Run the build first\./);
  assert.equal((await buildOutput(directory).home()).body.toString("utf8"), "<h1>home</h1>");
});

test("with no directory given, the one CHECK_DIR names is read, or dist", () => {
  const given = process.env.CHECK_DIR;
  try {
    process.env.CHECK_DIR = directory;
    assert.equal(buildOutput().root, directory);
    delete process.env.CHECK_DIR;
    assert.equal(buildOutput().root, path.resolve("dist"));
  } finally {
    if (given === undefined) delete process.env.CHECK_DIR;
    else process.env.CHECK_DIR = given;
  }
});
