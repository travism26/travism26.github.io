// Proves each built-page check against small pages held in memory: it must
// accept a clean page and name the problem in a broken one.

import assert from "node:assert/strict";
import { test } from "node:test";

import { checkPage } from "./page-checks.js";

// The content the in-memory pages are checked against.
const content = {
  identity: { name: "Ada Okafor" },
  experience: [
    { company: "Marsh & Sons", role: "Engineer · Build Tools", period: "2019 — Present" },
    { company: "O'Neil Labs", role: "Developer", period: "2015 — 2019" },
  ],
  featured: [{ name: "Fast → Faster" }],
  projects: [{ name: "10× Parser" }, { name: 'The "Quoted" Tool' }],
};

// The content as a server renderer writes it: one element per value, with the
// characters HTML reserves escaped.
const cleanRoot = `
  <article><div>2019 — Present</div><h3>Engineer · Build Tools</h3><div>Marsh &amp; Sons <span>· Lagos</span></div></article>
  <article><div>2015 — 2019</div><h3>Developer</h3><div>O&#x27;Neil Labs <span>· Lagos</span></div></article>
  <div><div><div>10+</div><div>Years shipping software</div></div><div><div>75%</div><div>Faster tests</div></div></div>
  <div>repos · 10+</div>
  <article><h3>Fast → Faster<span>private</span></h3></article>
  <a href="https://example.com/parser"><div>10× Parser</div></a>
  <a href="https://example.com/quoted"><div>The &quot;Quoted&quot; Tool</div></a>
  <footer>© 2026 Ada Okafor</footer>`;

const cleanPage = {
  html: `<!doctype html>
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito" />
        <link rel="stylesheet" href="/assets/index-abc123.css" />
        <script type="module" crossorigin src="/assets/index-abc123.js"></script>
      </head>
      <body><div id="root"><main>${cleanRoot}</main></div><script>document.title;</script></body>
    </html>`,
  assets: {
    "/assets/index-abc123.css": "body { margin: 0 }",
    "/assets/index-abc123.js": 'console.log("Minified React error #")',
  },
  tracked: {
    "src/data.js": 'export default { numbers: [{ value: "10+", label: "Years shipping software" }] };',
  },
};

// The years figures the site used to show. They are put together here so that
// this file does not hold the text the checks search tracked source for.
const staleFigures = [12, 13].map((years) => `${years}+`);

function sourceOf({ html, assets = {}, origin }) {
  return {
    name: "in-memory page",
    origin,
    html: async () => html,
    asset: async (pathname) => assets[pathname] ?? null,
  };
}

// What every check reports for a page and the tracked source that goes with
// it, checked against `expected` content.
function reportOf(page, expected = content) {
  const { tracked } = page;
  const trackedFiles = tracked && (async () => Object.entries(tracked).map(([path, text]) => ({ path, text })));
  return checkPage(sourceOf(page), { content: expected, trackedFiles });
}

// What the named check reports for a page.
async function resultOf(checkName, page) {
  const report = await reportOf(page);
  const entry = report.find((result) => result.name === checkName);
  assert.ok(entry, `no check named "${checkName}"`);
  return entry;
}

// The failures a page gets from the named check.
async function failuresOf(checkName, page) {
  return (await resultOf(checkName, page)).failures;
}

// The page with the content between its root tags replaced.
function withRoot(page, rootHtml) {
  return { ...page, html: page.html.replace(/(<div id="root">).*?(<\/div><script>)/s, (_, open, close) => open + rootHtml + close) };
}

function withBody(page, extraHtml, extraAssets = {}) {
  return {
    ...page,
    html: page.html.replace("</body>", `${extraHtml}</body>`),
    assets: { ...page.assets, ...extraAssets },
  };
}

test("a clean built page passes every check", async () => {
  const report = await reportOf(cleanPage);
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

test("a page whose body does not show the owner's name is reported", async () => {
  const page = withRoot(cleanPage, "");
  const failures = await failuresOf("shows the owner's name", page);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /Ada Okafor/);
});

test("the owner's name in the title or in a script does not count as shown", async () => {
  const page = withRoot(cleanPage, "");
  page.html = page.html
    .replace("<head>", "<head><title>Ada Okafor</title>")
    .replace("document.title;", 'document.title = "Ada Okafor";');
  const failures = await failuresOf("shows the owner's name", page);
  assert.equal(failures.length, 1);
});

test("an experience entry the page does not show is reported by company, role and period", async () => {
  const page = withRoot(cleanPage, cleanRoot.replace(/<article>.*?O&#x27;Neil.*?<\/article>/, ""));
  const failures = await failuresOf("shows every experience entry", page);
  assert.equal(failures.length, 3);
  assert.match(failures.join("\n"), /O'Neil Labs/);
  assert.match(failures.join("\n"), /Developer/);
  assert.match(failures.join("\n"), /2015 — 2019/);
});

test("an experience entry with one part missing is reported for that part", async () => {
  const page = withRoot(cleanPage, cleanRoot.replace("2019 — Present", "2019"));
  const failures = await failuresOf("shows every experience entry", page);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /period.*2019 — Present/);
});

test("an experience entry whose company and role are left only inside a sentence is reported in full", async () => {
  const withoutEntry = cleanRoot.replace(/<article>.*?O&#x27;Neil.*?<\/article>/, "");
  const page = withRoot(cleanPage, `${withoutEntry}<p>Once a Developer at O&#x27;Neil Labs.</p>`);
  const failures = await failuresOf("shows every experience entry", page);
  assert.equal(failures.length, 3);
});

test("a longer role does not stand in for a shorter one that begins it", async () => {
  const shorter = { company: "Quay Co", role: "Engineer", period: "2021 — Present" };
  const withShorter = { ...content, experience: [shorter, ...content.experience] };
  const entry = "<article><div>2021 — Present</div><h3>Engineer</h3><div>Quay Co <span>· Lagos</span></div></article>";

  const shown = await reportOf(withRoot(cleanPage, cleanRoot + entry), withShorter);
  assert.deepEqual(shown.flatMap((result) => result.failures), []);

  const notShown = await reportOf(cleanPage, withShorter);
  const failures = notShown.find((result) => result.name === "shows every experience entry").failures;
  assert.equal(failures.length, 3);
  assert.match(failures.join("\n"), /role of the Quay Co entry/);
});

test("a featured project the page does not show is reported", async () => {
  const page = withRoot(cleanPage, cleanRoot.replace("Fast → Faster", "Fast"));
  const failures = await failuresOf("shows every featured and listed project", page);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /featured.*Fast → Faster/);
});

test("a listed project the page does not show is reported", async () => {
  const page = withRoot(cleanPage, cleanRoot.replace("10× Parser", ""));
  const failures = await failuresOf("shows every featured and listed project", page);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /10× Parser/);
});

test("a project title that is left only inside a sentence is reported", async () => {
  const page = withRoot(cleanPage, `${cleanRoot.replace(/<a [^>]*><div>10× Parser.*?<\/a>/, "")}<p>I wrote 10× Parser in a week.</p>`);
  const failures = await failuresOf("shows every featured and listed project", page);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /listed.*10× Parser/);
});

test("a project that is both featured and listed has to be shown twice", async () => {
  const both = { ...content, projects: [...content.projects, { name: "Fast → Faster" }] };
  const listedToo = `${cleanRoot}<a href="https://example.com/fast"><div>Fast → Faster</div></a>`;

  const shownTwice = await reportOf(withRoot(cleanPage, listedToo), both);
  assert.deepEqual(shownTwice.flatMap((result) => result.failures), []);

  const shownOnce = await reportOf(cleanPage, both);
  const failures = shownOnce.find((result) => result.name === "shows every featured and listed project").failures;
  assert.equal(failures.length, 1);
  assert.match(failures[0], /Fast → Faster/);
  assert.match(failures[0], /featured/);
  assert.match(failures[0], /listed/);
});

test("a page without the years tile is reported", async () => {
  const page = withRoot(cleanPage, cleanRoot.replace("Years shipping software", "Years"));
  const failures = await failuresOf('the "Years shipping software" tile reads "10+"', page);
  assert.equal(failures.length, 1);
});

test("a years tile with another figure is reported, even when the right figure is elsewhere on the page", async () => {
  const page = withRoot(cleanPage, cleanRoot.replace("<div>10+</div>", "<div>9+</div>"));
  const failures = await failuresOf('the "Years shipping software" tile reads "10+"', page);
  assert.equal(failures.length, 1);
});

// Content with every kind of character HTML writes another way, and the ways a
// page can write it: as a server renderer does, as named references, and as
// numbered ones.
const awkwardContent = {
  identity: { name: "Zoë O'Brien-D'Arcy" },
  experience: [{ company: "Fish & Chips <Ltd>", role: 'The "Fixer" · R&D', period: "2019 — Present" }],
  featured: [{ name: "40min → 10min" }],
  projects: [{ name: "10× faster, 0% “magic”" }, { name: "if (a < b && b > c)" }],
};

const awkwardPages = {
  "a server renderer's escapes": `
    <footer>Zoë O&#x27;Brien-D&#x27;Arcy</footer>
    <article><div>2019 — Present</div><h3>The &quot;Fixer&quot; · R&amp;D</h3><div>Fish &amp; Chips &lt;Ltd&gt;</div></article>
    <h3>40min → 10min</h3><h3>10× faster, 0% “magic”</h3><h3>if (a &lt; b &amp;&amp; b &gt; c)</h3>`,
  "named references": `
    <footer>Zo&#235; O&apos;Brien-D&apos;Arcy</footer>
    <article><div>2019 &mdash; Present</div><h3>The &quot;Fixer&quot; &middot; R&amp;D</h3><div>Fish &amp; Chips &lt;Ltd&gt;</div></article>
    <h3>40min &rarr; 10min</h3><h3>10&times; faster, 0% &ldquo;magic&rdquo;</h3><h3>if (a &lt; b &amp;&amp; b &gt; c)</h3>`,
  "numbered references": `
    <footer>Zo&#xEB; O&#39;Brien-D&#39;Arcy</footer>
    <article><div>2019 &#8212; Present</div><h3>The &#34;Fixer&#34; &#xb7; R&#38;D</h3><div>Fish &#38; Chips &#60;Ltd&#62;</div></article>
    <h3>40min &#x2192; 10min</h3><h3>10&#215; faster, 0% &#x201C;magic&#x201d;</h3><h3>if (a &#60; b &#38;&#38; b &#62; c)</h3>`,
  "text split across lines, tags and non-breaking spaces": `
    <footer>Zoë
      <b>O&#x27;Brien</b>-D&#x27;Arcy</footer>
    <article><div>2019&nbsp;—&nbsp;Present</div><h3>The &quot;Fixer&quot; <span>·</span> R&amp;<!-- -->D</h3><div>Fish &amp; Chips
      &lt;Ltd&gt;</div></article>
    <h3>40min   →   10min</h3><h3>10× faster, <em>0%</em> “magic”</h3><h3>if (a &lt; b &amp;&amp; b &gt; c)</h3>`,
};

for (const [writing, rootHtml] of Object.entries(awkwardPages)) {
  test(`content is recognised in a page written with ${writing}`, async () => {
    const tile = "<div><div>10+</div><div>Years shipping software</div></div>";
    const report = await reportOf(withRoot(cleanPage, rootHtml + tile), awkwardContent);
    assert.deepEqual(report.flatMap((result) => result.failures), []);
  });
}

test("escaped markup in the page's text is read as text, not as tags", async () => {
  const page = withRoot(cleanPage, cleanRoot.replace("Ada Okafor", "&lt;b&gt;Ada&lt;/b&gt; Okafor"));
  const failures = await failuresOf("shows the owner's name", page);
  assert.equal(failures.length, 1);
});

test("a page with the loading splash is reported", async () => {
  const page = withBody(cleanPage, '<div id="boot">$ booting portfolio…</div>');
  const failures = await failuresOf("shows no loading splash", page);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /booting portfolio/);
});

for (const stale of staleFigures) {
  test(`a page that shows the stale figure ${stale.replace("+", " plus")} is reported`, async () => {
    const page = withRoot(cleanPage, `${cleanRoot}<p>Writing software for ${stale} years</p>`);
    const failures = await failuresOf("shows no stale years figure", page);
    assert.equal(failures.length, 1);
    assert.ok(failures[0].includes(`${stale} years`), failures[0]);
  });
}

test("a stale figure is reported however the page writes it", async () => {
  const [twelve] = staleFigures;
  const written = [
    `<p>${twelve.replace("+", "&#43;")} years</p>`,
    `<p>${twelve.replace("+", "&#x2b;")} years</p>`,
    `<p>${twelve.replace("+", "<!-- -->+")} years</p>`,
    `<p><span>${twelve.replace("+", "</span>+")} years</p>`,
  ];
  for (const html of written) {
    const failures = await failuresOf("shows no stale years figure", withRoot(cleanPage, cleanRoot + html));
    assert.equal(failures.length, 1, html);
  }
});

test("a stale figure outside the visible text is reported", async () => {
  const description = `<meta name="description" content="${staleFigures[0]} years of software">`;
  const page = { ...cleanPage, html: cleanPage.html.replace("<head>", `<head>${description}`) };
  const failures = await failuresOf("shows no stale years figure", page);
  assert.equal(failures.length, 1);
});

test("a longer number that ends like a stale figure is not reported", async () => {
  const page = withRoot(cleanPage, `${cleanRoot}<p>4${staleFigures[0]} hosts, since 20${staleFigures[1]}</p>`);
  assert.deepEqual(await failuresOf("shows no stale years figure", page), []);
});

test("a stale figure in tracked source is reported by file and line", async () => {
  const page = {
    ...cleanPage,
    tracked: { ...cleanPage.tracked, "README.md": `# Site\n\nShipping for ${staleFigures[1]} years.\n` },
  };
  const failures = await failuresOf("tracked source holds no stale years figure", page);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /README\.md:3/);
});

test("the lockfile's integrity hashes are not searched for stale figures", async () => {
  const lockfile = `"integrity": "sha512-ab${staleFigures[0]}cd/ef${staleFigures[1]}gh=="`;
  const page = { ...cleanPage, tracked: { ...cleanPage.tracked, "package-lock.json": lockfile } };
  assert.deepEqual(await failuresOf("tracked source holds no stale years figure", page), []);
});

test("the tracked-source check is skipped, not passed, when no tracked source is given", async () => {
  const result = await resultOf("tracked source holds no stale years figure", { ...cleanPage, tracked: undefined });
  assert.deepEqual(result.failures, []);
  assert.match(result.skipped, /tracked source/);
});

test("a check that ran is not marked as skipped", async () => {
  const report = await reportOf(cleanPage);
  assert.deepEqual(report.filter((result) => result.skipped), []);
});
