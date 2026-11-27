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
- `src/portfolio.jsx` is the page; `src/main.jsx` mounts it in the browser.
- `src/portfolio.css` is the stylesheet. It imports the design tokens in
  `src/design-tokens.css`.
- `index.html` is the page template Vite builds from.
- `checks/` holds the built-page checks.

## Checks

`npm test` reads the build output and fails if the page loads a script from a
third-party host, leaves anything for the browser to compile, ships a
development build of React, or references a local asset that does not exist.

The same checks can run against a served copy of the site:

```sh
CHECK_URL=https://travism26.github.io/ npm test
```

## Deploying

The workflow in `.github/workflows/deploy.yml` builds and checks every pull
request. On pushes to `main`, and when run by hand, it also deploys the build
to GitHub Pages and then runs the checks against the live site.
