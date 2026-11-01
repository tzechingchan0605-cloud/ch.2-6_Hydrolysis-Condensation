import { test, expect } from '@playwright/test';

async function start(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByLabel('Playback speed').selectOption('2');
}
async function selectAll(page) { await page.getByRole('button', { name: 'Select all', exact: true }).click(); }
async function joinAll(page) {
  await selectAll(page);
  await page.getByRole('button', { name: 'Join by condensation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeEnabled();
}
async function counts(page, units, bonds, water) {
  await expect(page.getByTestId('unit-count')).toHaveText(String(units));
  await expect(page.getByTestId('bond-count')).toHaveText(String(bonds));
  await expect(page.getByTestId('water-count')).toHaveText(String(water));
}
test('Traditional Chinese default, textbook sources and language preservation', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('小小分子');
  await page.getByRole('button', { name: '課本指南', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('圖 2.15');
  await expect(page.getByRole('dialog')).toContainText('圖 6.8');
  await page.getByRole('button', { name: '關閉', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await joinAll(page);
  await page.getByRole('button', { name: '繁體中文', exact: true }).click();
  await counts(page, 2, 1, 1);
  await expect(page.locator('.molecular-canvas')).toContainText('麥芽糖');
  await page.reload();
  await counts(page, 2, 1, 1);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
  expect(errors).toEqual([]);
});
for (const [product, units] of [['Maltose', ['Glucose', 'Glucose']], ['Sucrose', ['Glucose', 'Fructose']], ['Lactose', ['Glucose', 'Galactose']]]) {
  test(`${product} condensation and hydrolysis with correct products`, async ({ page }) => {
    await start(page);
    await page.locator('.examples').getByRole('button', { name: product, exact: true }).click();
    await joinAll(page);
    await counts(page, 2, 1, 1);
    await expect(page.locator('.molecular-canvas')).toContainText(product);
    await page.getByRole('button', { name: 'Bond 1', exact: true }).click();
    await page.getByRole('button', { name: 'Hydrolyse selected bonds', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeEnabled();
    await counts(page, 2, 0, 0);
    for (const unit of units) await expect(page.locator('.molecular-canvas')).toContainText(unit);
    await expect(page.locator('.water-ledger')).toContainText('Released 1');
    await expect(page.locator('.water-ledger')).toContainText('Used 1');
  });
}
test('unsupported combinations preserve molecules and water', async ({ page }) => {
  await start(page);
  await page.locator('.examples').getByRole('button', { name: 'Sucrose', exact: true }).click();
  await page.getByRole('button', { name: 'Add Galactose', exact: true }).click();
  await selectAll(page);
  await page.getByRole('button', { name: 'Join by condensation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('not included');
  await counts(page, 3, 0, 0);
});
test('six-unit chain, partial hydrolysis, full hydrolysis, undo and redo', async ({ page }) => {
  await start(page);
  await page.locator('.examples').getByRole('button', { name: '6 glucose units', exact: true }).click();
  await joinAll(page); await counts(page, 6, 5, 5);
  await page.getByRole('button', { name: 'Bond 3', exact: true }).click();
  await page.getByRole('button', { name: 'Hydrolyse selected bonds', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeEnabled();
  await counts(page, 6, 4, 4);
  await expect(page.locator('.product-label')).toHaveCount(2);
  await page.getByRole('button', { name: 'Hydrolyse all bonds', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeEnabled();
  await counts(page, 6, 0, 0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await counts(page, 6, 4, 4);
  await page.getByRole('button', { name: 'Redo', exact: true }).click(); await counts(page, 6, 0, 0);
});
test('triglyceride sequential attachment, fourth acid rejection and hydrolysis', async ({ page }) => {
  await start(page);
  await page.locator('.module-tabs').getByRole('button', { name: /Triglycerides/ }).click();
  for (let i = 0; i < 3; i++) {
    await page.locator('.molecular-canvas').getByRole('button', { name: 'Glycerol', exact: true }).click();
    const free = page.locator('.molecular-canvas .molecule-control[aria-label^="Fatty acid"]').filter({ has: page.locator('.molecule-label') });
    // Attached fatty acids have no individual label; each remaining free acid does.
    await free.first().click();
    await page.getByRole('button', { name: 'Join by condensation', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeEnabled();
    await counts(page, 4, i + 1, i + 1);
  }
  await expect(page.locator('.product-label')).toHaveText('Triglyceride');
  await page.getByRole('button', { name: 'Add Fatty acid B', exact: true }).click();
  await selectAll(page); await page.getByRole('button', { name: 'Join by condensation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('three attachment sites');
  await counts(page, 5, 3, 3);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Hydrolyse all bonds', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeEnabled();
  await counts(page, 4, 0, 0);
});
test('protein side chains persist after partial and complete hydrolysis', async ({ page }) => {
  await start(page); await page.locator('.module-tabs').getByRole('button', { name: /Proteins/ }).click();
  await joinAll(page); await counts(page, 4, 3, 3);
  await expect(page.locator('.molecular-canvas')).toContainText('RA');
  await expect(page.locator('.molecular-canvas')).toContainText('RB');
  await expect(page.locator('.molecular-canvas')).toContainText('RC');
  await page.getByRole('button', { name: 'Peptide bond 2', exact: true }).click();
  await page.getByRole('button', { name: 'Hydrolyse selected bonds', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeEnabled();
  await counts(page, 4, 2, 2);
  await page.getByRole('button', { name: 'Hydrolyse all bonds', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeEnabled();
  await counts(page, 4, 0, 0);
  await expect(page.locator('.molecular-canvas').getByRole('button', { name: 'Amino acid A', exact: true })).toHaveCount(2);
});
test('nucleotides reject wrong bases, recognise DNA/RNA and use no water', async ({ page }) => {
  await start(page); await page.locator('.module-tabs').getByRole('button', { name: /Nucleotides/ }).click();
  await page.getByRole('button', { name: 'Add Base U', exact: true }).click();
  for (const name of ['Phosphate group', 'Deoxyribose', 'Base U']) await page.locator('.molecular-canvas').getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Assemble nucleotide', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('DNA uses deoxyribose');
  await counts(page, 4, 0, 0);
  await page.locator('.examples').getByRole('button', { name: 'DNA', exact: true }).click();
  await selectAll(page); await page.getByRole('button', { name: 'Assemble nucleotide', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Assemble nucleotide', exact: true })).toBeEnabled();
  await counts(page, 3, 2, 0); await expect(page.locator('.product-label')).toHaveText('DNA nucleotide');
  await page.locator('.examples').getByRole('button', { name: 'RNA', exact: true }).click();
  await selectAll(page); await page.getByRole('button', { name: 'Assemble nucleotide', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Assemble nucleotide', exact: true })).toBeEnabled();
  await counts(page, 3, 2, 0); await expect(page.locator('.product-label')).toHaveText('RNA nucleotide');
});
test('keyboard selection, animation pause/step, replay without double water', async ({ page }) => {
  await start(page);
  const sugars = page.locator('.molecular-canvas').getByRole('button', { name: 'Glucose', exact: true });
  await sugars.nth(0).focus(); await page.keyboard.press('Enter');
  await sugars.nth(1).focus(); await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Join by condensation', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: '繁體中文', exact: true }).click();
  await expect(page.getByRole('button', { name: '播放', exact: true })).toBeEnabled();
  while (await page.getByRole('button', { name: '下一步', exact: true }).isEnabled()) await page.getByRole('button', { name: '下一步', exact: true }).click();
  await counts(page, 2, 1, 1);
  await page.getByRole('button', { name: '重播反應', exact: true }).click();
  await expect(page.getByRole('button', { name: '進行縮合', exact: true })).toBeEnabled();
  await counts(page, 2, 1, 1);
});
test('guided responses, translation, record export, and full reset', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Guided challenges', exact: true }).click();
  await selectAll(page); await page.getByRole('button', { name: 'Join by condensation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Enter a prediction');
  await page.getByLabel('My prediction', { exact: true }).fill('Sucrose and one water molecule.');
  await page.getByRole('button', { name: 'Join by condensation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeEnabled();
  await page.getByLabel('My explanation', { exact: true }).fill('One new bond formed. Water is a product.');
  await page.getByRole('button', { name: 'Save response', exact: true }).click();
  await page.getByRole('button', { name: '繁體中文', exact: true }).click();
  await expect(page.getByLabel('我的預測', { exact: true })).toHaveValue('Sucrose and one water molecule.');
  await page.locator('.header-tools').getByRole('button', { name: /實驗紀錄/ }).click();
  await expect(page.getByRole('dialog')).toContainText('One new bond formed. Water is a product.');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載 CSV', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('molecule-lab-zh.csv');
  const stream = await download.createReadStream(); const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString('utf8'); expect(csv).toContain('我的預測'); expect(csv).toContain('One new bond formed.');
  await page.getByRole('button', { name: '關閉', exact: true }).click();
  await page.getByRole('button', { name: '清除所有進度', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '清除所有進度', exact: true }).click();
  await counts(page, 2, 0, 0);
});
test('progress and assemblies survive switching modules and reload', async ({ page }) => {
  await start(page); await joinAll(page);
  await page.locator('.module-tabs').getByRole('button', { name: /Proteins/ }).click(); await joinAll(page);
  await page.locator('.module-tabs').getByRole('button', { name: /Carbohydrates/ }).click(); await counts(page, 2, 1, 1);
  await page.reload(); await counts(page, 2, 1, 1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await counts(page, 2, 0, 0);
});
test('dragging adds a component without forming bonds and is undoable', async ({ page }) => {
  await start(page);
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await page.getByRole('button', { name: 'Add Fructose', exact: true }).dispatchEvent('dragstart', { dataTransfer: transfer });
  await page.locator('.canvas-dropzone').dispatchEvent('drop', { dataTransfer: transfer });
  await counts(page, 3, 0, 0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await counts(page, 2, 0, 0);
});
test('all eight tasks load, and supplied lactose requires water before hydrolysis', async ({ page }) => {
  await start(page); await page.getByRole('button', { name: 'Guided challenges', exact: true }).click();
  for (let i = 0; i < 8; i++) {
    await page.getByLabel('Challenge', { exact: true }).selectOption(String(i));
    await expect(page.getByTestId('unit-count')).toHaveText(String(i === 4 ? 6 : [5, 6].includes(i) ? 4 : i === 7 ? 3 : 2));
    await expect(page.getByTestId('water-count')).toHaveText('0');
  }
  await page.getByLabel('Challenge', { exact: true }).selectOption('1');
  await page.getByLabel('My prediction', { exact: true }).fill('Glucose and galactose; one water is used.');
  await page.getByRole('button', { name: 'Bond 1', exact: true }).click();
  await page.getByRole('button', { name: 'Hydrolyse selected bonds', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Not enough water'); await counts(page, 2, 1, 0);
  await page.getByRole('button', { name: 'Add 1 water molecule', exact: true }).click();
  await page.getByRole('button', { name: 'Hydrolyse all bonds', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeEnabled();
  await counts(page, 2, 0, 0);
});
for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
  test(`responsive layout at ${viewport.width}px and translated interface`, async ({ page }) => {
    await page.setViewportSize(viewport); await start(page);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    for (const module of ['Carbohydrates', 'Triglycerides', 'Proteins', 'Nucleotides']) {
      await page.locator('.module-tabs').getByRole('button', { name: new RegExp(module) }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const chinese = await page.locator('main').innerText(); expect(chinese).not.toMatch(/[\u3400-\u9fff]/);
    }
    expect(errors).toEqual([]);
  });
}
