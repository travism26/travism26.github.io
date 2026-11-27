// Page sources for the built-page checks.
//
// A page source is where a page and its local assets come from:
//   name             label used in test output
//   origin           the page's own origin, when it has one
//   html()           the HTML of the home page
//   asset(pathname)  the text of a local asset, or null when it does not resolve

import { buildOutput } from "./build-output.js";

// The build output directory, read from disk: the one given, or the one the
// build output module reads when none is.
export function directorySource(directory) {
  const output = buildOutput(directory);

  return {
    name: output.root,
    async html() {
      return (await output.home()).body.toString("utf8");
    },
    async asset(pathname) {
      const found = await output.read(pathname);
      return found && found.body.toString("utf8");
    },
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
