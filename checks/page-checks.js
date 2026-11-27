// Built-page checks: what a client receives when it asks for the home page.
//
// checkPage(source) takes a page source (see page-sources.js) and reports the
// failures of every check. What the page should say comes from the content
// module, so a content edit needs no edit here. To add a check, write a
// function that takes the loaded page and the content and returns a list of
// failure messages, and add it to `checks`.
//
// One check is about the repository and not about the page: it searches the
// tracked source (see tracked-source.js), and runs only when checkPage is
// given that source.

import siteContent from "../src/data.js";

// The one value the checks pin instead of reading it from the content: how
// long the owner has been shipping software. When the figure moves on, it
// changes here as well as in the content.
const YEARS_FIGURE = "10+";
const YEARS_LABEL = "Years shipping software";

export const checks = [
  { name: "shows the owner's name", run: ownerName },
  { name: "shows every experience entry", run: experienceEntries },
  { name: "shows every featured and listed project", run: projectTitles },
  { name: `the "${YEARS_LABEL}" tile reads "${YEARS_FIGURE}"`, run: yearsTile },
  { name: "shows no stale years figure", run: staleYearsOnPage },
  {
    name: "tracked source holds no stale years figure",
    run: (page, content, trackedFiles) => staleYearsInSource(trackedFiles),
    skip: (trackedFiles) => (trackedFiles ? null : "no tracked source was given to search"),
  },
  { name: "shows no loading splash", run: loadingSplash },
  { name: "loads no script from a third-party host", run: thirdPartyScripts },
  { name: "compiles nothing in the browser", run: inBrowserCompilers },
  { name: "ships no development build of React", run: developmentBuilds },
  { name: "every local asset the HTML references resolves", run: unresolvedAssets },
];

// One result for each check: { name, failures }, or { name, failures: [],
// skipped: reason } for a check that was given nothing to look at.
//
// `trackedFiles` resolves to the tracked source to search with the page, as a
// list of { path, text }. Leave it out when there is none to search.
export async function checkPage(source, { content = siteContent, trackedFiles } = {}) {
  const page = await loadPage(source);
  const report = [];
  for (const { name, run, skip } of checks) {
    const skipped = skip?.(trackedFiles);
    report.push(
      skipped ? { name, failures: [], skipped } : { name, failures: await run(page, content, trackedFiles) },
    );
  }
  return report;
}

// The page as the checks see it:
//   html          the HTML, comments removed
//   lines         the text a reader of the page sees, as the lines it is set in
//   text          the same text in one piece, each run of space as one space
//   scripts       every script the page loads: { url, type, body }
//   assets        every URL the HTML loads as part of the page (not links to follow)
//   isLocal       whether a URL the page references is served by the site itself
//   read          the text of a local URL, or null when it does not resolve
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

  const lines = readableLines(markup);

  return {
    html,
    lines,
    text: lines.join(" "),
    scripts,
    assets: [...assets],
    isLocal,
    read: (reference) => source.asset(new URL(reference, base).pathname),
  };
}

function ownerName(page, content) {
  return missingText(page, [["the owner's name", content.identity.name]]);
}

function experienceEntries(page, content) {
  return missingLines(
    page,
    content.experience.flatMap(({ company, role, period }) => [
      [`the company of the ${role} entry (${period})`, company],
      [`the role of the ${company} entry (${period})`, role],
      [`the period of the ${role} entry at ${company}`, period],
    ]),
  );
}

function projectTitles(page, content) {
  return missingLines(page, [
    ...content.featured.map(({ name }) => ["the featured project", name]),
    ...content.projects.map(({ name }) => ["the listed project", name]),
  ]);
}

// One failure for each [description, text] pair the page does not show.
function missingText(page, expected) {
  return expected
    .filter(([, text]) => !page.text.includes(collapseSpace(text)))
    .map(([description, text]) => `the page does not show ${description}: "${text}"`);
}

// The failures for the [description, text] pairs the page does not show. A
// text is shown where a line of the page begins with it: a title in the middle
// of a sentence is not the title of an entry. Each pair needs a line of its
// own, so a text the content has twice has to be on the page twice.
function missingLines(page, expected) {
  const descriptionsOf = new Map();
  for (const [description, written] of expected) {
    const text = collapseSpace(written);
    descriptionsOf.set(text, [...(descriptionsOf.get(text) ?? []), description]);
  }

  // The longest texts take their lines first: a line that begins with
  // "Engineer (Contract)" also begins with "Engineer", and must be left for
  // the text it spells out in full.
  const unclaimed = [...page.lines];
  const shownOf = new Map();
  for (const text of [...descriptionsOf.keys()].sort((a, b) => b.length - a.length)) {
    let shown = 0;
    while (shown < descriptionsOf.get(text).length) {
      const line = unclaimed.findIndex((candidate) => candidate.startsWith(text));
      if (line === -1) break;
      unclaimed.splice(line, 1);
      shown += 1;
    }
    shownOf.set(text, shown);
  }

  return [...descriptionsOf]
    .filter(([text, descriptions]) => shownOf.get(text) < descriptions.length)
    .map(([text, descriptions]) =>
      descriptions.length === 1
        ? `the page has no line of its own for ${descriptions[0]}: "${text}"`
        : `the page shows only ${shownOf.get(text)} of the ${descriptions.length} lines that should begin with ` +
          `"${text}": ${descriptions.join("; ")}`,
    );
}

// A tile is a figure with its label beside it, in either order.
function yearsTile(page) {
  const figure = `(?<![\\w.])${escapeForPattern(YEARS_FIGURE)}(?![\\w+])`;
  const label = escapeForPattern(YEARS_LABEL);
  if (new RegExp(`${figure} ${label}|${label} ${figure}`).test(page.text)) return [];
  return [`the page does not show "${YEARS_FIGURE}" beside "${YEARS_LABEL}"`];
}

function escapeForPattern(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The years figures the site used to show: twelve or thirteen, then a plus
// sign. They are written as a pattern so that this file does not hold the text
// it searches tracked source for.
const STALE_YEARS = /(?<![\d.,])1[23]\+/g;

// Every stale figure in the text, with the words around it.
function staleYearsIn(text) {
  return [...text.matchAll(STALE_YEARS)].map(({ 0: figure, index }) => {
    const around = text.slice(Math.max(0, index - 30), index + figure.length + 30);
    return { figure, index, around: collapseSpace(around) };
  });
}

// A reader's text misses what is only in the head or in an attribute, and the
// HTML misses a figure split across tags, so both are searched.
function staleYearsOnPage(page) {
  const shown = staleYearsIn(page.text);
  const found = shown.length > 0 ? shown : staleYearsIn(page.html);
  return found.map(({ figure, around }) => `the page says "${figure}": …${around}…`);
}

// The lockfile is left out: its integrity hashes are random letters, digits
// and plus signs, and can spell a figure by chance.
const NOT_SEARCHED = new Set(["package-lock.json"]);

async function staleYearsInSource(trackedFiles) {
  const failures = [];
  for (const { path, text } of await trackedFiles()) {
    if (NOT_SEARCHED.has(path)) continue;
    for (const { figure, index, around } of staleYearsIn(text)) {
      const line = text.slice(0, index).split("\n").length;
      failures.push(`${path}:${line} says "${figure}": …${around}…`);
    }
  }
  return failures;
}

// The words the page used to show over everything until its scripts had run.
const SPLASH_TEXT = "booting portfolio";

function loadingSplash(page) {
  return page.html.toLowerCase().includes(SPLASH_TEXT) ? [`the page holds the loading splash: "${SPLASH_TEXT}"`] : [];
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
const ANY_TAG = new RegExp(`</?([a-z][a-z0-9-]*)\\b${ATTRIBUTES}>`, "gi");

// The text a reader of the page sees, line by line: the body with its tags
// removed and its character references decoded. `markup` is the HTML without
// its comments and scripts. Tags that flow within a line of text vanish; any
// other tag ends the line.
const UNSEEN_ELEMENTS = /<(head|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<!doctype[^>]*>/gi;
const TEXT_LEVEL_TAGS = new Set(
  "a abbr b bdi bdo cite code data dfn em i kbd mark q s samp small span strong sub sup time u var wbr".split(" "),
);

// Stands for the end of a line until the text is split. The character cannot
// be written in HTML, and any the markup holds anyway is read as a space.
const LINE_END = "\u0000";

function readableLines(markup) {
  return markup
    .replaceAll(LINE_END, " ")
    .replace(UNSEEN_ELEMENTS, LINE_END)
    .replace(ANY_TAG, (_, tag) => (TEXT_LEVEL_TAGS.has(tag.toLowerCase()) ? "" : LINE_END))
    .split(LINE_END)
    .map((line) => collapseSpace(decodeCharacterReferences(line)))
    .filter(Boolean);
}

function collapseSpace(text) {
  return text.replace(/\s+/g, " ").trim();
}

// The named references are the ones for characters the site's content uses;
// numeric references cover everything else.
const NAMED_CHARACTERS = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0",
  copy: "\u00a9", middot: "\u00b7", times: "\u00d7",
  ndash: "\u2013", mdash: "\u2014", lsquo: "\u2018", rsquo: "\u2019",
  ldquo: "\u201c", rdquo: "\u201d", hellip: "\u2026", rarr: "\u2192",
};

// A reference that names no character is left as it was written.
function decodeCharacterReferences(text) {
  return text.replace(/&(?:#x([0-9a-f]+)|#([0-9]+)|([a-z]+));/gi, (reference, hex, decimal, name) => {
    if (name) return NAMED_CHARACTERS[name] ?? reference;
    const codePoint = hex ? parseInt(hex, 16) : parseInt(decimal, 10);
    return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : reference;
  });
}

function attributesOf(attributeText) {
  const attributes = {};
  for (const [, name, double, single, bare] of attributeText.matchAll(
    /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g,
  )) {
    attributes[name.toLowerCase()] = double ?? single ?? bare ?? "";
  }
  return attributes;
}
