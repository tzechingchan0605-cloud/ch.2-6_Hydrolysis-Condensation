import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: './tests',
  workers: 2,
  reporter: 'list',
  use: {
    viewport: { width: 1440, height: 900 },
    headless: true,
    launchOptions: existsSync('/usr/bin/chromium')
      ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] }
      : {},
  },
});
