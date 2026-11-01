import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  testIgnore: '**/deployment.spec.js',
  expect: { timeout: 10000 }, // The default-speed reaction now lasts 5.85 seconds.
  use: { baseURL: 'http://127.0.0.1:5173', headless: true, launchOptions: existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {} },
  workers: 2,
  reporter: 'list',
  webServer: { command: 'npm run dev -- --port 5173', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
