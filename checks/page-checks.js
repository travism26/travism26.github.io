// Built-page checks: what a client receives when it asks for the home page.
//
// checkPage(source) takes a page source (see page-sources.js) and reports the
// failures of every check. To add a check, write a function that takes the
// loaded page and returns a list of failure messages, and add it to `checks`.

export const checks = [
  { name: "loads no script from a third-party host", run: thirdPartyScripts },
  { name: "compiles nothing in the browser", run: inBrowserCompilers },
  { name: "ships no development build of React", run: developmentBuilds },
  { name: "every local asset the HTML references resolves", run: unresolvedAssets },
];

export async function checkPage(source) {
  const page = await loadPage(source);
  const report = [];
  for (const check of checks) {
    report.push({ name: check.name, failures: await check.run(page) });
  }
  return report;
}

// The page as the checks see it:
//   html      the HTML, comments removed
//   scripts   every script the page loads: { url, type, body }
//   assets    every URL the HTML loads as part of the page (not links to follow)
//   isLocal   whether a URL the page references is served by the site itself
//   read      the text of a local URL, or null when it does not resolve
async function loadPage(source) {
  const html = (await source.html()).replace(/<!--[\s\S]*?-->/g, "");
  const base = new URL(`${source.origin ?? "http://site.invalid"}/`);
  const isLocal = (reference) => new URL(reference, base).origin === base.origin;

  const scripts = [];
  const assets = new Set();
  const markup = html.replace(SCRIPT_ELEMENT, (_, attributeText, body) => {
    const { src, type = "" } = attributesOf(attributeText);
    scripts.push({ url: src ?? null, type, body: src ? "" : body });
    if (src) assets.add(src);
    return "";
  });
  for (const [, tag, attributeText] of markup.matchAll(START_TAG)) {
    const { src, href, rel = "", as } = attributesOf(attributeText);
    if (src) assets.add(src);
    if (tag.toLowerCase() !== "link" || !href) continue;
    assets.add(href);
    const preloadsScript = /^modulepreload$/i.test(rel) || (/^preload$/i.test(rel) && as === "script");
    if (preloadsScript) scripts.push({ url: href, type: "", body: "" });
  }

  return {
    html,
    scripts,
    assets: [...assets],
    isLocal,
    read: (reference) => source.asset(new URL(reference, base).pathname),
  };
}

function thirdPartyScripts(page) {
  return page.scripts
    .filter((script) => script.url && !page.isLocal(script.url))
    .map((script) => `script loaded from a third-party host: ${script.url}`);
}

// A compiler shows up either as its own script or as source the browser cannot
// run as written, marked with a script type for the compiler to pick up.
const COMPILER_SCRIPT = /babel|typescript(\.min)?\.js|sucrase|esbuild-wasm/i;
const COMPILED_TYPE = /^text\/(babel|jsx|tsx|typescript)$/i;

function inBrowserCompilers(page) {
  const failures = [];
  for (const script of page.scripts) {
    if (script.url && COMPILER_SCRIPT.test(script.url)) {
      failures.push(`in-browser compiler loaded: ${script.url}`);
    }
    if (COMPILED_TYPE.test(script.type)) {
      failures.push(`script left for the browser to compile: type="${script.type}" ${script.url ?? "(inline)"}`);
    }
  }
  return failures;
}

// Messages found only in React 18's development builds; production builds
// replace them with error codes. The first is in react-dom, the second in
// react, react-dom and both JSX runtimes.
const DEVELOPMENT_MARKERS = ["Download the React DevTools", "Each child in a list should have a unique"];

async function developmentBuilds(page) {
  const failures = [];
  for (const script of page.scripts) {
    if (script.url && /\.development\./i.test(script.url)) {
      failures.push(`development build loaded: ${script.url}`);
      continue;
    }
    if (script.url && !page.isLocal(script.url)) continue;
    const text = script.url ? await page.read(script.url) : script.body;
    const marker = DEVELOPMENT_MARKERS.find((message) => text?.includes(message));
    if (marker) {
      failures.push(`development build of React in ${script.url ?? "an inline script"}: contains "${marker}"`);
    }
  }
  return failures;
}

async function unresolvedAssets(page) {
  const failures = [];
  for (const reference of page.assets.filter(page.isLocal)) {
    if ((await page.read(reference)) === null) failures.push(`local asset does not resolve: ${reference}`);
  }
  return failures;
}

const ATTRIBUTES = `((?:"[^"]*"|'[^']*'|[^>"'])*)`;
const SCRIPT_ELEMENT = new RegExp(`<script\\b${ATTRIBUTES}>([\\s\\S]*?)</script\\s*>`, "gi");
const START_TAG = new RegExp(`<([a-z][a-z0-9-]*)\\b${ATTRIBUTES}>`, "gi");

function attributesOf(attributeText) {
  const attributes = {};
  for (const [, name, double, single, bare] of attributeText.matchAll(
    /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g,
  )) {
    attributes[name.toLowerCase()] = double ?? single ?? bare ?? "";
  }
  return attributes;
}
