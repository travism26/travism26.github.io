// Browser smoke test: loads the built page in Chromium and checks that it
// becomes interactive, and that its content does not depend on JavaScript.
//
//   npm run test:smoke                       tests ./dist
//   CHECK_DIR=some/dir npm run test:smoke    tests another directory
//
// The test serves the directory itself. Which projects a filter tag should
// show is read from the content module, so a content edit needs no edit here.

import { expect, test } from "@playwright/test";

import D from "../src/data.js";
import { serveDirectory } from "./serve-directory.js";

// The one filter that is not a tag. Its label is part of the page, not of the
// content module.
const SHOW_ALL = "All";

const tags = [...new Set(D.projects.flatMap((project) => project.tags))];
const taggedWith = (tag) => D.projects.filter((project) => project.tags.includes(tag));

let site;

test.beforeAll(async () => {
  site = await serveDirectory(process.env.CHECK_DIR ?? "dist");
});

test.afterAll(async () => {
  await site?.close();
});

// A project card is a link that shows the project's name and summary.
function projectCard(page, project) {
  return page.getByRole("link", { name: project.name }).filter({ hasText: project.summary });
}

async function expectProjectCards(page, shown) {
  for (const project of D.projects) {
    if (shown.includes(project)) {
      await expect(projectCard(page, project), `card for ${project.name}`).toBeVisible();
    } else {
      await expect(projectCard(page, project), `card for ${project.name}`).toBeHidden();
    }
  }
}

// The site has no favicon. Chromium asks for /favicon.ico anyway when it runs
// with a window or in its newer headless mode, and logs the 404. Only that one
// message is set aside: a failed load of any other address still counts.
function isMissingFavicon(message) {
  return (
    message.text().startsWith("Failed to load resource") &&
    message.location().url === new URL("/favicon.ico", site.url).href
  );
}

// Everything the page reports as an error: console errors and uncaught
// exceptions.
function collectErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !isMissingFavicon(message)) {
      errors.push(`${message.text()} (${message.location().url})`);
    }
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return errors;
}

test("the page becomes interactive and logs no errors", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(site.url);

  await test.step("every project card is shown at first", async () => {
    await expectProjectCards(page, D.projects);
  });

  // A tag every project carries would leave the list as it is, and the steps
  // below would pass on a page that never became interactive.
  expect(
    tags.some((tag) => taggedWith(tag).length < D.projects.length),
    "at least one filter tag leaves a project out",
  ).toBe(true);

  for (const tag of tags) {
    await test.step(`selecting "${tag}" narrows the cards to its projects`, async () => {
      await page.getByRole("button", { name: tag, exact: true }).click();
      await expectProjectCards(page, taggedWith(tag));
    });
  }

  await test.step(`selecting "${SHOW_ALL}" restores the full list`, async () => {
    await page.getByRole("button", { name: SHOW_ALL, exact: true }).click();
    await expectProjectCards(page, D.projects);
  });

  expect(errors, "errors the page logged").toEqual([]);
});

test.describe("with JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });

  test("the main heading is visible", async ({ page }) => {
    await page.goto(site.url);

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/\S/);
  });
});
