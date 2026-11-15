/** Browser-test setup, separate from the application's runtime configuration. */
import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: './tests',
  // Keep browser scenarios separate from Vitest domain tests in the same tests directory.
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    launchOptions: {
      // Use this environment's system Chromium when available; otherwise use Playwright's download.
      executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined,
      // Container-only browser launch compatibility. This flag affects the TEST browser,
      // not users' browsers; keep these tests isolated and avoid untrusted external pages.
      args: ['--no-sandbox'],
    },
  },
  // Playwright starts a local dev server and waits for its URL before running the first test.
  webServer: {
    // -- passes flags through npm to Vite; strictPort fails instead of silently choosing another port.
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    // Local runs may reuse a server; CI requires its own fresh instance for repeatability.
    reuseExistingServer: !process.env.CI,
  },
});
