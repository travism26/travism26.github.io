// Proves each built-page check against small pages held in memory: it must
// accept a clean page and name the problem in a broken one.

import assert from "node:assert/strict";
import { test } from "node:test";

import { checkPage } from "./page-checks.js";

const cleanPage = {
  html: `<!doctype html>
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito" />
        <link rel="stylesheet" href="/assets/index-abc123.css" />
        <script type="module" crossorigin src="/assets/index-abc123.js"></script>
      </head>
      <body><div id="root"></div><script>document.title;</script></body>
    </html>`,
  assets: {
    "/assets/index-abc123.css": "body { margin: 0 }",
    "/assets/index-abc123.js": 'console.log("Minified React error #")',
  },
};

// The failures a page gets from the named check.
async function failuresOf(checkName, { html, assets = {}, origin }) {
  const report = await checkPage({
    name: "in-memory page",
    origin,
    html: async () => html,
    asset: async (pathname) => assets[pathname] ?? null,
  });
  const entry = report.find((result) => result.name === checkName);
  assert.ok(entry, `no check named "${checkName}"`);
  return entry.failures;
}

function withBody(page, extraHtml, extraAssets = {}) {
  return {
    ...page,
    html: page.html.replace("</body>", `${extraHtml}</body>`),
    assets: { ...page.assets, ...extraAssets },
  };
}

test("a clean built page passes every check", async () => {
  const report = await checkPage({
    name: "in-memory page",
    html: async () => cleanPage.html,
    asset: async (pathname) => cleanPage.assets[pathname] ?? null,
  });
  assert.deepEqual(report.flatMap((result) => result.failures), []);
});

test("a script from another host is reported", async () => {
  const page = withBody(cleanPage, '<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>');
  const failures = await failuresOf("loads no script from a third-party host", page);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /unpkg\.com/);
});

test("a preloaded module from another host is reported", async () => {
  const page = withBody(cleanPage, '<link rel="modulepreload" href="//cdn.example/chunk.js">');
  const failures = await failuresOf("loads no script from a third-party host", page);
  assert.match(failures.join("\n"), /cdn\.example/);
});

test("a script addressed by the site's own origin is not third-party", async () => {
  const page = withBody(
    { ...cleanPage, origin: "https://travism26.github.io" },
    '<script src="https://travism26.github.io/assets/index-abc123.js"></script>',
  );
  assert.deepEqual(await failuresOf("loads no script from a third-party host", page), []);
});

test("a script commented out of the HTML is ignored", async () => {
  const page = withBody(cleanPage, '<!-- <script src="https://unpkg.com/react/umd/react.development.js"></script> -->');
  assert.deepEqual(await failuresOf("loads no script from a third-party host", page), []);
});

test("a script type that needs compiling in the browser is reported", async () => {
  const page = withBody(cleanPage, '<script type="text/babel" src="/app.jsx"></script>', { "/app.jsx": "<App />" });
  const failures = await failuresOf("compiles nothing in the browser", page);
  assert.match(failures.join("\n"), /text\/babel/);
});

test("a compiler script is reported even when the site hosts it", async () => {
  const page = withBody(cleanPage, '<script src="/vendor/babel.min.js"></script>', { "/vendor/babel.min.js": "" });
  const failures = await failuresOf("compiles nothing in the browser", page);
  assert.match(failures.join("\n"), /babel\.min\.js/);
});

test("a development build of React named in a script URL is reported", async () => {
  const page = withBody(cleanPage, '<script src="/vendor/react-dom.development.js"></script>', {
    "/vendor/react-dom.development.js": "",
  });
  const failures = await failuresOf("ships no development build of React", page);
  assert.match(failures.join("\n"), /react-dom\.development\.js/);
});

test("a development build of React inside a bundled script is reported", async () => {
  const page = {
    ...cleanPage,
    assets: {
      ...cleanPage.assets,
      "/assets/index-abc123.js": 'console.info("%cDownload the React DevTools for a better development experience")',
    },
  };
  const failures = await failuresOf("ships no development build of React", page);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /index-abc123\.js/);
});

test("a development build of React in an inline script is reported", async () => {
  const page = withBody(cleanPage, '<script>error("Each child in a list should have a unique \\"key\\" prop.")</script>');
  const failures = await failuresOf("ships no development build of React", page);
  assert.equal(failures.length, 1);
});

test("a local asset that does not resolve is reported", async () => {
  const page = withBody(cleanPage, '<img src="/assets/missing-abc123.png">');
  const failures = await failuresOf("every local asset the HTML references resolves", page);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /missing-abc123\.png/);
});

test("a missing stylesheet or script is reported", async () => {
  const page = { ...cleanPage, assets: {} };
  const failures = await failuresOf("every local asset the HTML references resolves", page);
  assert.equal(failures.length, 2);
});

test("links to other pages and other hosts are not treated as assets", async () => {
  const page = withBody(
    cleanPage,
    '<a href="#work">work</a><a href="/elsewhere">x</a><a href="https://github.com/travism26">gh</a>',
  );
  assert.deepEqual(await failuresOf("every local asset the HTML references resolves", page), []);
});
