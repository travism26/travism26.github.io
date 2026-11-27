// Runs every built-page check against the build output directory, or against
// a served site when CHECK_URL is set.
//
//   npm test                                         checks ./dist
//   CHECK_DIR=some/dir npm test                      checks another directory
//   CHECK_URL=https://travism26.github.io/ npm test  checks the live site

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

import { checkPage, checks } from "./page-checks.js";
import { directorySource, urlSource } from "./page-sources.js";
import { trackedFiles } from "./tracked-source.js";

// A directory is build output from this checkout, so the checkout's tracked
// source is searched with it. A served site is checked on its own.
const checked = process.env.CHECK_URL
  ? { source: urlSource(process.env.CHECK_URL) }
  : { source: directorySource(process.env.CHECK_DIR ?? "dist"), trackedFiles };

describe(`built page at ${checked.source.name}`, () => {
  let report;
  before(async () => {
    report = await checkPage(checked.source, { trackedFiles: checked.trackedFiles });
  });

  for (const { name } of checks) {
    test(name, (t) => {
      const { failures, skipped } = report.find((result) => result.name === name);
      if (skipped) return t.skip(skipped);
      if (failures.length > 0) assert.fail(failures.join("\n"));
    });
  }
});
