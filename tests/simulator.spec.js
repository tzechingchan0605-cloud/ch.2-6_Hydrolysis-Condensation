import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const html=readFileSync('index.html','utf8');
const epoch=new Date('2026-11-02T12:00:00Z');
test.beforeEach(async({page})=>{
 page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.clock.install({time:epoch});await page.setContent(html);await page.clock.pauseAt(new Date(epoch.getTime()+1000));
});
test.afterEach(async({page})=>expect(page.errors).toEqual([]));
const seek=async(page,sec)=>page.locator('#storyTime').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(sec));
const choose=async(page,reaction)=>{await page.locator('#modeA').click();await page.locator(`button[data-reaction="${reaction}"]`).click();};

test('renamed levels, multiple chains and only the two working enzymes',async({page})=>{
 await expect(page.locator('[data-zoom="3.3"]')).toContainText('香蕉果肉細胞');
 await expect(page.locator('[data-zoom="8.5"]')).toContainText('多糖與雙糖的水解');
 await seek(page,6.5);await expect(page.locator('#zoomGranuleWorld [data-starch-chain]')).toHaveCount(4);
 await seek(page,10);await expect(page.locator('.zoom-enzyme')).toHaveCount(2);
 await expect(page.locator('#zBeta')).toContainText('澱粉酶');
 await expect(page.locator('#zBeta')).not.toContainText('β-');
 await expect(page.locator('[data-molecule="water"] circle')).toHaveCount(0);
 await expect(page.locator('#zoomMoleculeWorld')).toContainText('1 個雙糖 ＋ H₂O → 2 個單糖');
});
test('the entire eight-unit chain becomes four maltose molecules, then eight glucose molecules',async({page})=>{
 await seek(page,11.8);await expect(page.locator('#zNodes [data-product="starch"]')).toHaveCount(6);
 await expect(page.locator('#zNodes [data-product="maltose"]')).toHaveCount(2);
 await seek(page,15.9);await expect(page.locator('#zNodes [data-product="starch"]')).toHaveCount(0);
 await expect(page.locator('#zNodes [data-product="maltose"]')).toHaveCount(8);
 await expect(page.locator('#zBonds [data-cleaved="false"]')).toHaveCount(4);
 await expect(page.locator('#zoomMoleculeWorld')).toHaveAttribute('data-waters-used','3');
 await seek(page,25.8);await expect(page.locator('#zNodes [data-product="glucose"]')).toHaveCount(8);
 await expect(page.locator('#zBonds [data-cleaved="false"]')).toHaveCount(0);
 await expect(page.locator('#zoomMoleculeWorld')).toHaveAttribute('data-waters-used','7');
 await seek(page,9);await expect(page.locator('#zNodes [data-product="starch"]')).toHaveCount(8);
 await expect(page.locator('#zoomMoleculeWorld')).toHaveAttribute('data-waters-used','0');
});
test('Part A starch processes the entire chain and scrubbing restores previous states',async({page})=>{
 await choose(page,'starch');await expect(page.locator('#storyTime')).toBeVisible();
 await expect(page.locator('#equation')).toContainText('澱粉酶');await expect(page.locator('#equation')).not.toContainText('酶 ?');
 await seek(page,14);await expect(page.locator('#zNodes [data-product="maltose"]')).toHaveCount(6);
 await expect(page.locator('#zNodes [data-product="starch"]')).toHaveCount(0);
 await expect(page.locator('#zoomMoleculeWorld')).toHaveAttribute('data-waters-used','2');
 await seek(page,3);await expect(page.locator('#zNodes [data-product="starch"]')).toHaveCount(6);
 await expect(page.locator('#lesson')).toHaveAttribute('data-playing','false');
});
for(const [reaction,enzyme,products] of [['maltose','麥芽糖酶',['glucose','glucose']],['sucrose','蔗糖酶',['glucose','fructose']]]){
 test(`${reaction}: named enzyme, water participation, products, reuse, reversible timeline`,async({page})=>{
  await choose(page,reaction);await expect(page.locator('#enzymeName')).toHaveText(enzyme);
  await expect(page.locator('#equation')).toContainText(enzyme);
  await seek(page,4);await expect(page.locator('#c0water')).toBeVisible();
  await expect(page.locator('#cycle0')).toHaveAttribute('data-cleaved','false');
  await seek(page,14);
  for(const cycle of [0,1]){
   expect(await page.locator(`#cycle${cycle} [data-product]`).evaluateAll(ns=>ns.map(n=>n.dataset.product))).toEqual(products);
   await expect(page.locator(`#c${cycle}water`)).toBeHidden();
  }
  await expect(page.locator('#ledger')).toContainText('2');
  await seek(page,1);await expect(page.locator('#c0water')).toBeVisible();
  await expect(page.locator('#cycle1')).toBeHidden();
 });
}
test('all three enzymes use different colours and different active-site outlines',async({page})=>{
 const colours=[],shapes=[];
 await choose(page,'starch');colours.push(await page.locator('#zBeta .zoom-enzyme-body').getAttribute('fill'));shapes.push(await page.locator('#zBeta .zoom-enzyme-body').getAttribute('d'));
 for(const reaction of ['maltose','sucrose']){await choose(page,reaction);colours.push(await page.locator('#enzymeBody').getAttribute('fill'));shapes.push(await page.locator('#enzymeBody').getAttribute('d'));}
 expect(new Set(colours).size).toBe(3);expect(new Set(shapes).size).toBe(3);
});
test('active-site docking precedes water use; the same enzyme persists across all cleavages',async({page})=>{
 const enzyme=await page.locator('#zBeta').elementHandle();await enzyme.evaluate(e=>e.marker='same');
 for(const [sec,id,bond] of [[9.8,'release0',1],[12,'release1',3],[14.2,'release2',5]]){
  await seek(page,sec);await expect(page.locator(`#zReaction${id}`)).toHaveAttribute('data-bound','true');
  await expect(page.locator(`#zBond${bond}`)).toHaveAttribute('data-cleaved','false');
  expect(await page.evaluate(id=>{const m=document.getElementById('zBeta').transform.baseVal.consolidate().matrix;const target=document.getElementById(`zTarget${id}`);return Math.hypot(m.e-Number(target.getAttribute('cx')),m.f-Number(target.getAttribute('cy')));},id)).toBeLessThan(1);
 }
 expect(await enzyme.evaluate(e=>e.marker)).toBe('same');
});
test('pause, language change, keyboard seeking and resume retain the selected time',async({page})=>{
 await choose(page,'maltose');await page.locator('#play').click();await page.clock.runFor(3000);await page.locator('#play').click();
 const time=await page.locator('#lesson').getAttribute('data-elapsed');await page.clock.fastForward(5000);await expect(page.locator('#lesson')).toHaveAttribute('data-elapsed',time);
 await page.locator('#en').click();await expect(page.locator('#lesson')).toHaveAttribute('data-elapsed',time);
 await page.locator('#storyTime').focus();await page.keyboard.press('End');await expect(page.locator('#lesson')).toHaveAttribute('data-elapsed','14.000');
 await seek(page,5);await page.locator('#play').click();await page.clock.runFor(1000);expect(Number(await page.locator('#lesson').getAttribute('data-elapsed'))).toBeCloseTo(6,1);
});
test('continuous demonstration completes all four scenes in 74 seconds',async({page})=>{
 await page.locator('#sequence').click();
 for(const reaction of ['maltose','sucrose']){await page.clock.fastForward(14000);await expect(page.locator('#lesson')).toHaveAttribute('data-reaction',reaction);}
 await page.clock.fastForward(14000);await expect(page.locator('#lesson')).toHaveAttribute('data-mode','banana');
 await page.clock.fastForward(32100);await expect(page.locator('#lesson')).toHaveAttribute('data-playing','false');
 await expect(page.locator('#review')).toBeVisible();await expect(page.locator('#summaryText')).toBeHidden();
});
for(const width of [390,768,1440,391])test(`all diagrams fit at ${width}px in both languages`,async({page})=>{
 await page.setViewportSize({width,height:900});
 if(width===391)await page.addStyleTag({content:':root{font-family:monospace}'});
 for(const lang of ['zh','en']){
  await page.locator(`#${lang}`).click();
  for(const reaction of ['starch','maltose','sucrose']){
   await choose(page,reaction);for(const sec of [0,4,9.5,14]){await seek(page,sec);await fits(page);}
  }
  await page.locator('#modeB').click();for(const sec of [0,3.4,6.5,8.5,10,12,14.4,15.9,17,20,25.8,32]){await seek(page,sec);await fits(page);}
 }
});
async function fits(page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const over=await page.locator('#diagram').evaluate(svg=>{const bounds=svg.getBoundingClientRect();return [...svg.querySelectorAll('text')].filter(el=>{const b=el.getBoundingClientRect();return b.width&&b.height&&getComputedStyle(el).display!=='none'&&!el.closest('[style*="display: none"]')&&(b.left<bounds.left-2||b.right>bounds.right+2||b.top<bounds.top-2||b.bottom>bounds.bottom+2);}).map(el=>el.textContent);});expect(over).toEqual([]);
}

test('the uploaded photos are embedded exactly and the selected cell granule supplies level 03',async({page})=>{
 const banana='data:image/jpeg;base64,'+readFileSync('assets/banana.jpeg').toString('base64');
 const cell='data:image/jpeg;base64,'+readFileSync('assets/banana cell.jpg').toString('base64');
 await expect(page.locator('#bananaPhoto')).toHaveAttribute('href',banana);
 await expect(page.locator('#bananaCellPhoto')).toHaveAttribute('href',cell);
 await expect(page.locator('#granulePhoto')).toHaveAttribute('href',cell);
 // The first selection falls in exposed pulp, above the folded peel.
 const sourcePoint=await page.locator('#bananaPhoto').evaluate(image=>{const selection=document.getElementById('pulpSelection');return [(Number(selection.getAttribute('cx'))-Number(image.getAttribute('x')))/Number(image.getAttribute('width'))*463,(Number(selection.getAttribute('cy'))-Number(image.getAttribute('y')))/Number(image.getAttribute('height'))*662];});
 expect(sourcePoint[0]).toBeCloseTo(240);expect(sourcePoint[1]).toBeCloseTo(205);
 await seek(page,3.4);await expect(page.locator('#bananaCellPhoto')).toBeVisible();
 const selected=await page.locator('#bananaCellPhoto').evaluate(image=>{const selection=document.getElementById('granuleSelection');return [(Number(selection.getAttribute('cx'))-Number(image.getAttribute('x')))/Number(image.getAttribute('width'))*451,(Number(selection.getAttribute('cy'))-Number(image.getAttribute('y')))/Number(image.getAttribute('height'))*313];});
 expect(selected).toEqual([191,94]);
 await seek(page,6.3);await expect(page.locator('#granulePhoto')).toBeVisible();
 await expect(page.locator('#granuleChainModel')).toHaveAttribute('opacity','0');
 await seek(page,6.9);await expect(page.locator('#granuleChainModel')).toHaveAttribute('opacity','1');
 await expect(page.locator('#zoomGranuleWorld')).toContainText('照片 → 澱粉鏈結構示意');
 await seek(page,3.4);await seek(page,6.3);await expect(page.locator('#granuleChainModel')).toHaveAttribute('opacity','0');
});

test('teacher notes section is removed',async({page})=>{
 await expect(page.locator('#modelNotes, footer.teacher-notes')).toHaveCount(0);
 await expect(page.locator('body')).not.toContainText('模型說明、科學來源與教師操作');
});
for(const mode of ['banana','maltose'])test(`${mode}: all five playback speeds advance by the selected rate`,async({page})=>{
 if(mode!=='banana')await choose(page,mode);
 await expect(page.locator('#playbackSpeed option')).toHaveText(['0.25X','0.50X','1.00X','1.25X','1.50X']);
 for(const speed of ['0.25','0.5','1','1.25','1.5']){
  await seek(page,0);await page.locator('#playbackSpeed').selectOption(speed);await page.locator('#play').click();
  await page.clock.runFor(2000);await page.locator('#play').click();
  expect(Number(await page.locator('#lesson').getAttribute('data-elapsed'))).toBeCloseTo(2*Number(speed),1);
 }
});
test('changing speed during playback preserves the current frame, scrubbing and language keep the rate',async({page})=>{
 await page.locator('#play').click();await page.clock.runFor(2000);
 const before=Number(await page.locator('#lesson').getAttribute('data-elapsed'));
 await page.locator('#playbackSpeed').selectOption('0.25');
 expect(Number(await page.locator('#lesson').getAttribute('data-elapsed'))).toBeCloseTo(before,1);
 await page.clock.runFor(4000);await page.locator('#play').click();
 expect(Number(await page.locator('#lesson').getAttribute('data-elapsed'))).toBeCloseTo(before+1,1);
 await seek(page,15);await page.locator('#en').click();await choose(page,'sucrose');
 await expect(page.locator('#playbackSpeed')).toHaveValue('0.25');
 await expect(page.locator('#playbackSpeed')).toHaveAccessibleName('Playback speed');
 await page.locator('#replay').click();await page.clock.runFor(2000);await page.locator('#play').click();
 expect(Number(await page.locator('#lesson').getAttribute('data-elapsed'))).toBeCloseTo(.5,1);
});
test('continuous demonstration respects speed across scene boundaries and stops at the end',async({page})=>{
 await page.locator('#playbackSpeed').selectOption('1.5');await page.locator('#sequence').click();
 await page.clock.runFor(10000);await expect(page.locator('#lesson')).toHaveAttribute('data-reaction','maltose');
 expect(Number(await page.locator('#lesson').getAttribute('data-elapsed'))).toBeCloseTo(1,1);
 await page.clock.fastForward(40000);await expect(page.locator('#lesson')).toHaveAttribute('data-mode','banana');
 await expect(page.locator('#lesson')).toHaveAttribute('data-elapsed','32.000');await expect(page.locator('#lesson')).toHaveAttribute('data-playing','false');
});
for(const size of [{width:1240,height:700},{width:1440,height:810},{width:390,height:844}])test(`text panels and controls never overlap at ${size.width}×${size.height}`,async({page})=>{
 await page.setViewportSize(size);
 for(const lang of ['zh','en']){
  await page.locator(`#${lang}`).click();
  for(const sec of [0,28.2,32]){
   await seek(page,sec);
   if(sec===32)await page.locator('#showSummary').click();
   const boxes=await page.evaluate(()=>{
    const ids=['scene','legend','storyTimebar','bananaStatus','bananaNote','review'];
    const panels=ids.map(id=>document.getElementById(id)).filter(e=>!e.hidden).map(e=>({id:e.id,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom}));
    return {panels,lesson:document.getElementById('lesson').getBoundingClientRect().toJSON(),controls:document.querySelector('.controls').getBoundingClientRect().toJSON()};
   });
   for(let i=1;i<boxes.panels.length;i++)expect(boxes.panels[i].top,`${boxes.panels[i].id} overlaps previous panel`).toBeGreaterThanOrEqual(boxes.panels[i-1].bottom-1);
   expect(boxes.controls.top).toBeGreaterThanOrEqual(boxes.lesson.bottom);
   expect(boxes.lesson.bottom).toBeGreaterThanOrEqual(boxes.panels.at(-1).bottom);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
 }
});

test('starch captions and product labels match the actual cleavage events when seeking both ways',async({page})=>{
 await choose(page,'starch');
 for(const [sec,count,caption,product] of [[2.5,0,'水解','生成物待揭示'],[4.5,1,'分解代謝後，產物從酶中釋出','麥芽糖'],[7.5,1,'水解','麥芽糖'],[10,2,'分解代謝後，產物從酶中釋出','麥芽糖'],[11,2,'酶沒有被消耗，可再次使用','麥芽糖'],[3.9,0,'水解','生成物待揭示'],[4,1,'分解代謝後，產物從酶中釋出','麥芽糖']]){
  await seek(page,sec);await expect(page.locator('#zoomMoleculeWorld')).toHaveAttribute('data-cleavages',String(count));
  await expect(page.locator('#stageCaption')).toHaveText(caption);await expect(page.locator('[data-equation-product]')).toHaveText(product);
 }
});
