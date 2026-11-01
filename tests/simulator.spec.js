import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const epoch = new Date('2026-11-01T12:00:00Z');
test.beforeEach(async ({ page }) => {
  page.errors = []; page.externalRequests = [];
  page.on('pageerror', error => page.errors.push(error.message));
  await page.route('**/*', route => {
    if (/^https?:/.test(route.request().url())) {
      page.externalRequests.push(route.request().url()); return route.abort();
    }
    return route.continue();
  });
  await page.clock.install({ time: epoch });
  // Load the complete local document with no server and every network request blocked.
  await page.setContent(html);
  await page.clock.pauseAt(new Date(epoch.getTime() + 1000));
});
test.afterEach(async ({ page }) => {
  expect(page.errors).toEqual([]);
  expect(page.externalRequests).toEqual([]);
});
const English = async page => page.getByRole('button', { name: 'English', exact: true }).click();
const elapsed = page => page.locator('#lesson').getAttribute('data-elapsed').then(Number);
const select = async (page, reaction) => page.locator(`button[data-reaction="${reaction}"]`).click();
const play = async page => page.locator('#play').click();
const forward = async (page, ms) => page.clock.fastForward(ms);
async function productTypes(page, cycle) {
  return page.locator(`#cycle${cycle} [data-product]`).evaluateAll(nodes => nodes.map(n => n.dataset.product).filter(Boolean));
}
async function waterDistance(page, cycle = 0) {
  return page.evaluate(c => {
    const matrix = document.getElementById(`c${c}water`).transform.baseVal.consolidate().matrix;
    const target = document.getElementById(`c${c}target`);
    return Math.hypot(matrix.e - Number(target.getAttribute('cx')), matrix.f - Number(target.getAttribute('cy')));
  }, cycle);
}

test('self-contained file opens offline in Traditional Chinese with an oral enzyme question', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
  await expect(page.locator('#stageCaption')).toHaveText('這項反應需要哪種酶？');
  await expect(page.locator('#enzymeName')).toHaveText('酶 ?');
  await expect(page.locator('#c0water')).toBeVisible();
  await expect(page.locator('#cycle1')).toBeHidden();
  expect(await productTypes(page, 0)).toEqual([]);
  await expect(page.locator('[data-equation-product]')).toHaveText('產物待揭示');
  await expect(page.locator('textarea, input[type="text"], input[type="password"]')).toHaveCount(0);
  const source = readFileSync('index.html', 'utf8');
  expect(source).not.toMatch(/<(?:script|link)[^>]+(?:src|href)=/i);
});

for (const [reaction, enzyme, expected] of [
  ['maltose', 'Maltase', ['glucose', 'glucose']],
  ['sucrose', 'Sucrase', ['glucose', 'fructose']],
]) {
  test(`${reaction}: contact, water participation, correct products and enzyme reuse`, async ({ page }) => {
    await English(page); await select(page, reaction);
    const enzymeElement = await page.locator('#enzymeBody').elementHandle();
    const enzymeShape = await enzymeElement.getAttribute('d');
    await enzymeElement.evaluate(e => { e.identityMarker = 'same-enzyme'; });
    await play(page);
    await expect(page.locator('#enzymeName')).toHaveText(enzyme);
    await forward(page, 3000);
    await expect(page.locator('#c0target')).toBeVisible();
    expect(await productTypes(page, 0)).toEqual([]);
    const far = await waterDistance(page);
    await page.clock.runFor(2400);
    expect(await waterDistance(page)).toBeLessThan(far - 50);
    await expect(page.locator('#stageCaption')).toHaveText('Water takes part in hydrolysis');
    await forward(page, 1000);
    expect(await productTypes(page, 0)).toEqual(expected);
    await expect(page.locator('#c0water')).toBeHidden();
    await expect(page.locator('#c0b0')).toBeHidden();
    await expect(page.locator('#ledger')).toHaveText('Bonds broken 1 · Water used 1');
    await forward(page, 3500);
    await expect(page.locator('#cycle1')).toBeVisible();
    await expect(page.locator('#c1water')).toBeVisible();
    await expect(page.locator('#c0water')).toBeHidden();
    await expect(page.locator('#enzymeModel')).toHaveCount(1);
    expect(await enzymeElement.evaluate(e => e.identityMarker)).toBe('same-enzyme');
    expect(await enzymeElement.getAttribute('d')).toBe(enzymeShape);
    await forward(page, 5000);
    expect(await productTypes(page, 1)).toEqual(expected);
    await expect(page.locator('#ledger')).toHaveText('Bonds broken 2 · Water used 2');
    await expect(page.locator('#lesson')).toHaveAttribute('data-playing', 'false');
    await expect(page.locator('#enzymeReuse')).toHaveText('Same enzyme · not consumed');
    await expect(page.locator('#equation')).toContainText(reaction === 'maltose' ? 'Two glucose molecules' : 'Glucose + fructose');
    for (const cycle of [0, 1]) await expect(page.locator(`#c${cycle}water`)).toBeHidden();
  });
}

test('starch releases a two-glucose maltose fragment and retains a four-unit shorter chain', async ({ page }) => {
  await English(page); await play(page); await forward(page, 8000);
  expect(await productTypes(page, 0)).toEqual(['starch', 'starch', 'starch', 'starch', 'maltose', 'maltose']);
  await expect(page.locator('#c0b3')).toBeHidden();
  for (const bond of [0, 1, 2, 4]) {
    expect(await page.locator(`#c0b${bond}`).evaluate(e => getComputedStyle(e).display)).not.toBe('none');
    expect(await page.locator(`#c0b${bond}`).evaluate(e => e.getBBox().width)).toBeGreaterThan(0);
  }
  await expect(page.locator('#c0productLeft')).toHaveText('Shorter starch chain');
  await expect(page.locator('#c0productRight')).toHaveText('Maltose');
  await expect(page.locator('#sceneEyebrow')).toHaveText('Simplified curriculum model');
  await forward(page, 7000);
  expect(await productTypes(page, 1)).toEqual(['starch', 'starch', 'starch', 'starch', 'maltose', 'maltose']);
  await expect(page.locator('#ledger')).toHaveText('Bonds broken 2 · Water used 2');
  await page.locator('#modelNotes').evaluate(d => { d.open = true; });
  await expect(page.locator('#modelNotes')).toContainText('real starch breakdown involves different enzymes and other intermediates');
});

for (const reaction of ['starch', 'maltose', 'sucrose']) {
  test(`${reaction}: each cleavage consumes exactly one water molecule at the selected bond`, async ({ page }) => {
    await English(page); await select(page, reaction); await play(page);
    await forward(page, 5500);
    await expect(page.locator('#c0water')).toBeVisible();
    expect(await waterDistance(page)).toBeLessThan(5);
    await expect(page.locator('#ledger')).toHaveText('Bonds broken 0 · Water used 0');
    await page.clock.runFor(200);
    await expect(page.locator('#c0water')).toBeHidden();
    await expect(page.locator('#cycle0')).toHaveAttribute('data-cleaved', 'true');
    await expect(page.locator('#ledger')).toHaveText('Bonds broken 1 · Water used 1');
    await forward(page, 5750);
    await expect(page.locator('#c1water')).toBeVisible();
    expect(await waterDistance(page, 1)).toBeLessThan(5);
    await page.clock.runFor(150);
    await expect(page.locator('#c1water')).toBeHidden();
    await expect(page.locator('#ledger')).toHaveText('Bonds broken 2 · Water used 2');
  });
}

test('pause freezes the model, resume advances once, and repeated replay does not multiply timers', async ({ page }) => {
  await English(page); await play(page); await page.clock.runFor(4500); await play(page);
  const frozen = await elapsed(page);
  const water = await page.locator('#c0water').getAttribute('transform');
  await forward(page, 45000);
  expect(await elapsed(page)).toBe(frozen);
  await expect(page.locator('#c0water')).toHaveAttribute('transform', water);
  await play(page); await page.clock.runFor(1000);
  expect(await elapsed(page)).toBeCloseTo(frozen + 1, 1);
  for (let i = 0; i < 4; i++) await page.locator('#replay').click();
  await page.clock.runFor(1000);
  expect(await elapsed(page)).toBeCloseTo(1, 1);
  await forward(page, 14000);
  expect(await elapsed(page)).toBe(14);
  await expect(page.locator('#lesson')).toHaveAttribute('data-playing', 'false');
  await forward(page, 30000); expect(await elapsed(page)).toBe(14);
});

test('switching reaction cancels playback and returns to a fresh prediction', async ({ page }) => {
  await English(page); await play(page); await forward(page, 6000); await select(page, 'sucrose');
  expect(await elapsed(page)).toBe(0);
  await expect(page.locator('#lesson')).toHaveAttribute('data-playing', 'false');
  await expect(page.locator('#enzymeName')).toHaveText('Enzyme ?');
  expect(await productTypes(page, 0)).toEqual([]);
  await forward(page, 30000); expect(await elapsed(page)).toBe(0);
  await play(page); await forward(page, 14500);
  expect(await productTypes(page, 0)).toEqual(['glucose', 'fructose']);
});

test('enzyme can be revealed before playing and hidden without changing the animation', async ({ page }) => {
  await English(page); await select(page, 'maltose'); await page.locator('#enzymeToggle').check();
  await expect(page.locator('#enzymeName')).toHaveText('Maltase');
  expect(await elapsed(page)).toBe(0);
  await play(page); await forward(page, 4500); const before = await elapsed(page);
  await page.locator('#enzymeToggle').uncheck(); await expect(page.locator('#enzymeName')).toHaveText('Enzyme ?');
  expect(await elapsed(page)).toBe(before);
});

test('language switching preserves exact progress, running state and the same enzyme', async ({ page }) => {
  await play(page); await forward(page, 5000); const before = await elapsed(page);
  const body = await page.locator('#enzymeBody').elementHandle();
  await body.evaluate(e => { e.identityMarker = 'retained'; });
  await English(page);
  expect(await elapsed(page)).toBe(before);
  await expect(page.locator('#lesson')).toHaveAttribute('data-playing', 'true');
  expect(await body.evaluate(e => e.identityMarker)).toBe('retained');
  await expect(page.locator('#stageCaption')).toHaveText('Water takes part in hydrolysis');
  await page.getByRole('button', { name: '繁中', exact: true }).click();
  expect(await elapsed(page)).toBe(before);
  await expect(page.locator('#stageCaption')).toHaveText('水參與水解');
});

test('the four-scene continuous demonstration lasts 66 seconds and does not reveal the summary', async ({ page }) => {
  await English(page); await page.locator('#sequence').click();
  await forward(page, 14100); await expect(page.locator('#lesson')).toHaveAttribute('data-reaction', 'maltose');
  await forward(page, 14000); await expect(page.locator('#lesson')).toHaveAttribute('data-reaction', 'sucrose');
  await forward(page, 14000); await expect(page.locator('#lesson')).toHaveAttribute('data-mode', 'banana');
  await forward(page, 23000); await expect(page.locator('#lesson')).toHaveAttribute('data-playing', 'true');
  await expect(page.locator('#review')).toBeHidden();
  await forward(page, 1000); await expect(page.locator('#lesson')).toHaveAttribute('data-playing', 'false');
  expect(await elapsed(page)).toBe(24);
  await expect(page.locator('#review')).toBeVisible();
  await expect(page.locator('#summaryText')).toBeHidden();
  await expect(page.locator('#review .review-questions p')).toHaveCount(2);
});

test('stopping or manually switching out of a continuous demonstration cancels future scenes', async ({ page }) => {
  await English(page); await page.locator('#sequence').click(); await forward(page, 5000);
  await page.locator('#sequence').click(); const stopped = await elapsed(page);
  await forward(page, 70000); expect(await elapsed(page)).toBe(stopped);
  await expect(page.locator('#lesson')).toHaveAttribute('data-sequence', 'false');
  await page.locator('#sequence').click(); await forward(page, 15000); await select(page, 'starch');
  await forward(page, 70000); expect(await elapsed(page)).toBe(0);
  await expect(page.locator('#lesson')).toHaveAttribute('data-reaction', 'starch');
});

test('banana ripening starts with sugar, retains some starch and keeps molecular and cellular views separate', async ({ page }) => {
  await English(page); await page.locator('#modeB').click();
  expect(await page.locator('[data-sugar][data-visible="true"]').count()).toBe(3);
  expect(await page.locator('[data-granule][data-remaining="true"]').count()).toBe(10);
  await expect(page.locator('#diagram')).toContainText('Not a microscope image');
  await expect(page.locator('#multistepLabel')).toHaveText('Multistep conversion involving many enzymes');
  await expect(page.locator('#bananaNote')).toContainText('not the complete pathway');
  await expect(page.locator('#diagram #enzymeModel')).toHaveCount(0);
  await expect(page.locator('#diagram')).not.toContainText(/Amylase|Maltase|Sucrase/);
  await play(page); await forward(page, 24100);
  expect(await page.locator('[data-sugar][data-visible="true"]').count()).toBe(12);
  expect(await page.locator('[data-granule][data-remaining="true"]').count()).toBe(3);
  await expect(page.locator('#diagram')).toContainText('Ripe');
  await expect(page.locator('#summaryText')).toBeHidden();
  await page.locator('#showSummary').click();
  await expect(page.locator('#summaryText')).toContainText('processes involving many enzymes');
  await expect(page.locator('#review')).toContainText('did not directly measure sugar content');
  await page.getByRole('button', { name: '繁中', exact: true }).click();
  expect(await elapsed(page)).toBe(24);
  await expect(page.locator('#summaryText')).toHaveText('香蕉成熟時，部分澱粉被分解，並經多種酶參與的轉化形成可溶性糖，與甜度增加有關。');
});

test('reduced motion keeps every scientific stage and the same timing', async ({ page }) => {
  await English(page); await page.locator('#motionToggle').check(); await select(page, 'maltose'); await play(page);
  await forward(page, 4200);
  expect(await waterDistance(page)).toBeLessThan(1);
  await expect(page.locator('#c0water')).toBeVisible();
  expect(await productTypes(page, 0)).toEqual([]);
  await forward(page, 1500);
  expect(await productTypes(page, 0)).toEqual(['glucose', 'glucose']);
  await expect(page.locator('#c0water')).toBeHidden();
  await forward(page, 8500); expect(await elapsed(page)).toBe(14);
});

async function assertNoHorizontalOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function assertSvgTextFits(page) {
  const overflow = await page.locator('#diagram').evaluate(svg => {
    const bounds = svg.getBoundingClientRect();
    return [...svg.querySelectorAll('text')].filter(e => {
      const b = e.getBoundingClientRect();
      return b.width && b.height && getComputedStyle(e).display !== 'none' &&
        !e.closest('[style*="display: none"]') &&
        (b.left < bounds.left - 2 || b.right > bounds.right + 2 || b.top < bounds.top - 2 || b.bottom > bounds.bottom + 2);
    }).map(e => ({ text: e.textContent, bounds: e.getBoundingClientRect().toJSON() }));
  });
  expect(overflow).toEqual([]);
}
for (const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:810},{width:390,height:844,font:'DejaVu Sans'}]) {
  test(`layouts and translations at ${viewport.width}px${viewport.font ? ` with ${viewport.font}` : ''} keep diagrams and controls readable`, async ({ page }) => {
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    if(viewport.font) await page.addStyleTag({content:':root{font-family:"DejaVu Sans",sans-serif}'});
    await English(page);
    for (const reaction of ['starch','maltose','sucrose']) {
      await select(page, reaction); await play(page); await forward(page, 14500);
      await assertNoHorizontalOverflow(page); await assertSvgTextFits(page);
    }
    await page.locator('#modeB').click(); await play(page); await forward(page, 24500);
    await assertNoHorizontalOverflow(page); await assertSvgTextFits(page);
    await page.locator('#showSummary').click(); await assertNoHorizontalOverflow(page);
    const english = await page.locator('#projector').innerText();
    expect(english.replace('繁中','')).not.toMatch(/[\u3400-\u9fff]/);
    await page.getByRole('button', {name:'繁中',exact:true}).click();
    await assertNoHorizontalOverflow(page); await assertSvgTextFits(page);
  });
}

test('full screen preserves playback and all primary controls stay inside the viewport', async ({ page }) => {
  await English(page); await play(page); await forward(page, 5000); const before = await elapsed(page);
  await page.locator('#fullscreen').click();
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  expect(await elapsed(page)).toBe(before);
  for (const id of ['play','replay','modeA','modeB','sequence','fullscreen']) {
    const rect = await page.locator(`#${id}`).boundingBox();
    expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1441); expect(rect.y + rect.height).toBeLessThanOrEqual(901);
  }
  await page.locator('#fullscreen').click();
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  expect(await elapsed(page)).toBe(before);
});
