import { test, expect } from '@playwright/test';

test('production bundle loads and reacts under the GitHub Pages project path', async ({ page, baseURL }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(`Failed request: ${request.url()}`));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`);
  });

  await page.goto(baseURL);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('小小分子');
  // Reject the original raw source entry and assets that escape the project path.
  const assets = await page.locator('script[src], link[rel="stylesheet"]').evaluateAll(elements =>
    elements.map(element => element.src || element.href));
  expect(assets.length).toBeGreaterThan(0);
  for (const asset of assets) {
    expect(asset.startsWith(`${baseURL}assets/`)).toBe(true);
    expect(asset).not.toContain('.jsx');
  }
  expect(await page.locator('.molecular-canvas').evaluate(element => getComputedStyle(element).display)).toBe('block');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByLabel('Playback speed').selectOption('2');
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Join by condensation', exact: true }).click();
  await expect(page.getByTestId('bond-count')).toHaveText('1');
  await expect(page.getByTestId('water-count')).toHaveText('1');
  await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeEnabled();
  await expect(page.locator('.molecular-canvas')).toContainText('Maltose');
  await page.getByRole('button', { name: 'Hydrolyse all bonds', exact: true }).click();
  await expect(page.getByTestId('bond-count')).toHaveText('0');
  await expect(page.getByTestId('water-count')).toHaveText('0');
  await page.reload();
  await expect(page.getByRole('button', { name: '繁體中文', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
