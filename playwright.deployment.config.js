import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/deployment.spec.js',
  use: {
    baseURL: 'http://127.0.0.1:4173/ch.2-6_Hydrolysis-Condensation/',
    headless: true,
    launchOptions: existsSync('/usr/bin/chromium')
      ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] }
      : {},
  },
  reporter: 'list',
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort --base /ch.2-6_Hydrolysis-Condensation/',
    url: 'http://127.0.0.1:4173/ch.2-6_Hydrolysis-Condensation/',
    reuseExistingServer: false,
  },
});
