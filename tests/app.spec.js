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
async function dragOut(page, molecule) {
  // Use real pointer input to verify SVG pointer capture and release outside it.
  const source = await molecule.locator('.molecule-glyph').boundingBox();
  const target = await page.locator('.discard-bar').boundingBox();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
  await expect(page.getByRole('button', { name: 'Release to remove', exact: true })).toBeVisible();
  await page.mouse.up();
}
test('drag an unwanted sugar out; undo, redo and reload preserve the result', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Add Fructose', exact: true }).click();
  await dragOut(page, page.locator('.molecular-canvas').getByRole('button', { name: 'Fructose', exact: true }));
  await counts(page, 2, 0, 0);
  await expect(page.locator('.molecular-canvas').getByRole('button', { name: 'Fructose', exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Molecules removed');
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await counts(page, 3, 0, 0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click(); await counts(page, 2, 0, 0);
  await page.reload(); await counts(page, 2, 0, 0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await counts(page, 3, 0, 0);
});
test('dropping inside, Escape and pointer cancellation keep the sugar', async ({ page }) => {
  await start(page);
  const sugar = page.locator('.molecular-canvas').getByRole('button', { name: 'Glucose', exact: true }).first();
  const source = await sugar.locator('.molecule-glyph').boundingBox();
  const x = source.x + source.width / 2, y = source.y + source.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 30, y + 15, { steps: 5 }); await page.mouse.up();
  await counts(page, 2, 0, 0);
  await expect(sugar).toHaveAttribute('aria-pressed', 'false');
  const target = await page.locator('.discard-bar').boundingBox();
  for (const cancellation of ['escape', 'pointercancel']) {
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(target.x + 20, target.y + 20, { steps: 8 });
    if (cancellation === 'escape') await page.keyboard.press('Escape');
    else await sugar.evaluate(element => element.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })));
    await page.mouse.up();
    await counts(page, 2, 0, 0);
    await expect(page.locator('.discard-bar')).not.toHaveClass(/discard-ready/);
  }
  // A normal click after a cancelled drag must still select the sugar.
  await sugar.click(); await expect(sugar).toHaveAttribute('aria-pressed', 'true');
});
test('discarding bonded sugar keeps the molecule intact and the water ledger unchanged', async ({ page }) => {
  await start(page); await joinAll(page);
  await page.getByRole('button', { name: 'Add Galactose', exact: true }).click();
  await dragOut(page, page.locator('.molecular-canvas').getByRole('button', { name: 'Glucose', exact: true }).first());
  await counts(page, 1, 0, 1);
  await expect(page.locator('.water-ledger')).toContainText('Released 1');
  await expect(page.locator('.water-ledger')).toContainText('Used 0');
  await expect(page.locator('.molecular-canvas')).toContainText('Galactose');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await counts(page, 3, 1, 1);
  await expect(page.locator('.molecular-canvas')).toContainText('Maltose');
});
test('keyboard users can remove selected molecules and undo in both languages', async ({ page }) => {
  await start(page);
  await expect(page.getByRole('button', { name: 'Remove selected', exact: true })).toBeDisabled();
  const sugar = page.locator('.molecular-canvas').getByRole('button', { name: 'Glucose', exact: true }).first();
  await sugar.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Remove selected', exact: true }).focus(); await page.keyboard.press('Enter');
  await counts(page, 1, 0, 0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: '繁體中文', exact: true }).click();
  await page.getByRole('button', { name: '全選構件', exact: true }).click();
  await page.getByRole('button', { name: '移除所選分子', exact: true }).click();
  await counts(page, 0, 0, 0);
  await expect(page.getByRole('heading', { name: '從一個構件開始', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '復原', exact: true }).click(); await counts(page, 2, 0, 0);
});
test('bonding remains visible longer and blocks removal during playback', async ({ page }) => {
  await start(page); await selectAll(page);
  await page.getByRole('button', { name: 'Join by condensation', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove selected', exact: true })).toBeDisabled();
  const source = await page.locator('.molecular-canvas .molecule-glyph').first().boundingBox();
  const target = await page.locator('.discard-bar').boundingBox();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2); await page.mouse.down();
  await page.mouse.move(target.x + 20, target.y + 20, { steps: 8 }); await page.mouse.up();
  await counts(page, 2, 0, 0);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  // At 2x speed the former animation ended in 975ms; it must still be playing.
  await page.waitForTimeout(1200);
  await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Join by condensation', exact: true })).toBeEnabled();
  await counts(page, 2, 1, 1);
});
async function waterDistance(page) {
  return page.locator('.bond-water-path').first().evaluate(path => {
    const water = path.querySelector('.travelling-water rect').getBoundingClientRect();
    const bond = path.querySelector('.water-bond-target').getBoundingClientRect();
    return Math.hypot(water.x + water.width / 2 - bond.x - bond.width / 2, water.y + water.height / 2 - bond.y - bond.height / 2);
  });
}
test('complete water molecule moves away from a new bond and into a bond before hydrolysis', async ({ page }) => {
  await start(page); await selectAll(page);
  await page.getByRole('button', { name: 'Join by condensation', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Condensation: H₂O leaves the new bond', exact: true })).toBeVisible();
  await expect(page.locator('.travelling-water')).toHaveCount(1);
  await expect(page.locator('.travelling-water')).toContainText('OHHH₂O');
  const beforeLeaving = await waterDistance(page);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const afterLeaving = await waterDistance(page);
  expect(afterLeaving).toBeGreaterThan(beforeLeaving + 15);
  await page.waitForTimeout(150);
  expect(Math.abs(await waterDistance(page) - afterLeaving)).toBeLessThan(1);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await counts(page, 2, 1, 1);

  await page.getByRole('button', { name: 'Hydrolyse all bonds', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Hydrolysis: H₂O enters before the bond breaks', exact: true })).toBeVisible();
  await expect(page.locator('.bond-water-path')).toHaveAttribute('data-direction', 'in');
  // The water's destination is the highlighted bond, not an arbitrary canvas point.
  const endpoint = await page.locator('.bond-water-path').evaluate(path => {
    const line = path.querySelector('.water-trajectory'), bond = path.querySelector('.water-bond-target');
    return { to: [line.getAttribute('x2'), line.getAttribute('y2')], bond: [bond.getAttribute('cx'), bond.getAttribute('cy')] };
  });
  expect(endpoint.to).toEqual(endpoint.bond);
  await counts(page, 2, 1, 1);
  const beforeEntering = await waterDistance(page);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  expect(await waterDistance(page)).toBeLessThan(beforeEntering - 15);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await counts(page, 2, 0, 0);
  await expect(page.locator('.bond-water-path')).toHaveCount(0);
});
test('each changed bond has one water molecule and recognition has none', async ({ page }) => {
  await start(page);
  await page.locator('.examples').getByRole('button', { name: '6 glucose units', exact: true }).click();
  await selectAll(page); await page.getByRole('button', { name: 'Join by condensation', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.travelling-water')).toHaveCount(5);
  await counts(page, 6, 5, 5);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await page.getByRole('button', { name: 'Bond 3', exact: true }).click();
  await page.getByRole('button', { name: 'Hydrolyse selected bonds', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.travelling-water')).toHaveCount(1);
  const highlighted = await page.locator('.water-bond-target').evaluate(circle => [circle.getAttribute('cx'), circle.getAttribute('cy')]);
  const selectedBond = await page.getByRole('button', { name: 'Bond 3', exact: true }).locator('circle').evaluate(circle => [circle.getAttribute('cx'), circle.getAttribute('cy')]);
  expect(highlighted).toEqual(selectedBond);
  await page.locator('.module-tabs').getByRole('button', { name: /Nucleotides/ }).click();
  await selectAll(page); await page.getByRole('button', { name: 'Assemble nucleotide', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Step', exact: true }).click();
    await expect(page.locator('.travelling-water')).toHaveCount(0);
  }
});
test.describe('touch removal', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test('drag a sugar out with a touch gesture', async ({ page }) => {
    await start(page);
    await page.locator('.canvas-dropzone').scrollIntoViewIfNeeded();
    const source = await page.locator('.molecular-canvas .molecule-glyph').first().boundingBox();
    const zone = await page.locator('.canvas-dropzone').boundingBox();
    const x = source.x + source.width / 2, y = source.y + source.height / 2;
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 10; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (zone.x - 8 - x) * i / 10, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await counts(page, 1, 0, 0);
    await page.getByRole('button', { name: 'Undo', exact: true }).click(); await counts(page, 2, 0, 0);
    await session.detach();
  });
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
