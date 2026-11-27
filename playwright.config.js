import { defineConfig, devices } from "@playwright/test";

// The browser smoke test, on Chromium only. The test serves the build output
// itself, so there is no web server to configure here.
export default defineConfig({
  testDir: "smoke",
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
