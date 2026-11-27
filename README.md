# travism26.github.io

Source for <https://travism26.github.io/>, a single-page portfolio built with
React and Vite.

## Working on the site

You need Node 22 (the version is pinned in `.nvmrc`).

```sh
npm ci           # install the dependencies pinned in package-lock.json
npm run dev      # run the site locally with live reload
npm run build    # build the production site into dist/
npm test         # check the built page in dist/ (build first)
npm run preview  # serve dist/ locally

npx playwright install chromium  # once: download the browser for the smoke test
npm run test:smoke               # load the built page in dist/ in Chromium (build first)
```

## Layout

- `src/data.js` holds all the content. It is the only file to edit when the
  content changes.
- `src/portfolio.jsx` is the page. `src/prerender.jsx` renders it to HTML when
  the site is built, and `src/main.jsx` hydrates that HTML in the browser.
- `src/portfolio.css` is the stylesheet. It imports the design tokens in
  `src/design-tokens.css`.
- `index.html` is the page template Vite builds from. Its root element is
  empty; `vite.config.js` fills it with the rendered page, in the build and on
  the dev server alike.
- `checks/` holds the built-page checks.
- `smoke/` holds the browser smoke test. `playwright.config.js` configures it.

## Pre-rendering

The HTML the site serves already holds the whole page, so it can be read
without running any JavaScript. The page must render the same on the server and
in the browser: nothing in `src/portfolio.jsx` may read the clock, randomness or
browser-only globals such as `window` while rendering.

## Checks

`npm test` reads the build output and fails if the page:

- does not show the owner's name, every experience entry (company, role and
  period) and every featured and listed project title from `src/data.js`;
- does not show "10+" beside "Years shipping software", or shows one of the
  older years figures;
- still holds the loading splash;
- loads a script from a third-party host, leaves anything for the browser to
  compile, ships a development build of React, or references a local asset
  that does not exist.

It also fails if one of the older years figures is anywhere in the tracked
source.

What the page should say is read from `src/data.js`, and compared with the text
a reader sees, so a content edit needs no edit to the checks. The one exception
is the years figure, which is pinned in `checks/page-checks.js`.

An experience entry's company, role and period, and a project's title, each
have to begin a line of that text, once for every time `src/data.js` has them.
The same words inside a sentence elsewhere on the page do not count, and a
project that is both featured and listed has to be shown twice. The checks stop
at the text: they do not tell whether a company, a role and a period are shown
together as one entry, and a title that also begins some other line of the page
(a project called "Security" would match the filter of that name) passes with
its card gone.

The same checks can run against a served copy of the site. The tracked-source
check is skipped there.

```sh
CHECK_URL=https://travism26.github.io/ npm test
```

`npm test` needs nothing installed, so it also runs where `npm ci` has not.

## Browser smoke test

`npm run test:smoke` serves the build output on a local port, opens it in
Chromium with [Playwright](https://playwright.dev/) and fails if:

- the page logs an error to the console or throws one, which is how a mismatch
  between the pre-rendered HTML and the browser's first render shows up;
- selecting a filter tag does not narrow the project cards to the projects
  `src/data.js` gives that tag, or selecting "All" does not bring every card
  back;
- the main heading is not visible with JavaScript disabled.

The site has no favicon, and Chromium logs the missing `/favicon.ico` when it
runs with a window. That one message is not counted as an error; a failed load
of anything else is.

Playwright downloads its own Chromium; `npx playwright install chromium` does
that once per Playwright version. To test a directory other than `dist/`:

```sh
CHECK_DIR=some/dir npm run test:smoke
```

## Deploying

The workflow in `.github/workflows/deploy.yml` builds the site and runs the
checks and the browser smoke test on the build: for every pull request, for
every push to `main`, and whenever it is run by hand. Only a run on `main`,
whether a push or a run by hand started it, then deploys the build to GitHub
Pages and runs the checks against the live site. A run by hand on any other
branch or on a tag stops after the checks, as a pull request does. If the
build, a check or the smoke test fails, nothing is deployed.
