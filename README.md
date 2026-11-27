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

The same checks can run against a served copy of the site. The tracked-source
check is skipped there.

```sh
CHECK_URL=https://travism26.github.io/ npm test
```

## Deploying

The workflow in `.github/workflows/deploy.yml` builds and checks every pull
request. On pushes to `main`, and when run by hand, it also deploys the build
to GitHub Pages and then runs the checks against the live site.
