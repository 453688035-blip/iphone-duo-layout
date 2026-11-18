const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { readdirSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { updatePreview } from './update-preview.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const engine = process.env.DUO_BROWSER === 'webkit' ? webkit : chromium;
const executablePath = process.env.DUO_BROWSER_PATH;
const browser = await engine.launch(executablePath ? { executablePath } : {});
const dir = fileURLToPath(new URL('../../output/汽车营销内容工厂-Duo预览/', import.meta.url));
const temp = mkdtempSync(resolve(tmpdir(), 'duo-smoke-'));
const shots = process.env.DUO_SCREENSHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const poses = { 'duo-outer-portrait':[466,678], 'duo-outer-landscape':[678,466], 'duo-inner-portrait':[669,951], 'duo-inner-landscape':[951,669], 'duo-book':[951,669], 'duo-tabletop':[669,951], 'iphone-18-pro':[402,874] };
try {
for (const file of readdirSync(dir).filter(x=>x.endsWith('.html'))) {
 const page=await browser.newPage({ viewport:{width:1280,height:740} });
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(5000);

 await page.goto(pathToFileURL(resolve(dir,file)).href);
 const select = async pose => {
  const button = page.locator(`button[data-dp-pose="${pose}"]`);
  if (!await button.isVisible()) {
   const brand = pose.startsWith('huawei-') ? 'huawei' : 'apple';
   await page.locator(`[data-dp-brand="${brand}"]`).click();
  }
  await button.click();
 };
 for (const viewport of [{width:1280,height:740},{width:390,height:540},{width:740,height:390}]) {
  await page.setViewportSize(viewport);
  for(const [pose,[w,h]] of Object.entries(poses)) {
   await select(pose);
   const geo=await page.evaluate(()=>{
    const $=id=>document.getElementById(id); const rect=n=>n.getBoundingClientRect();
    const s=$('dpScreen'), d=rect($('dpDevice')), c=rect($('dpCaption')), b=rect($('dpBar'));
    const win=rect(s.parentElement), home=rect(document.querySelector('.dp-home'));
    return {size:[s.parentElement.clientWidth,s.parentElement.clientHeight],
      topReserve:(rect(s).top-win.top)/(win.width/s.parentElement.clientWidth),
      bottomPadding:parseFloat(getComputedStyle(document.querySelector('.app-shell')).paddingBottom),
      homeClear:home.bottom<=win.bottom,
      sidebarGap:getComputedStyle(document.querySelector('nav')).display==='none' ? 0 : win.bottom-rect(document.querySelector('nav')).bottom-(win.bottom-rect(s).bottom), over:s.scrollWidth-s.clientWidth, top:d.top-c.bottom,
      toolbar:c.top-b.bottom, barCenter:(b.left+b.right)/2-innerWidth/2, barTop:b.top, bottom:innerHeight-d.bottom, left:d.left, right:innerWidth-d.right,
      h1:rect(document.querySelector('h1')).top-rect(s).top,
      innerSide:getComputedStyle(document.querySelector('nav')).display};
   });
   assert.deepEqual(geo.size,[w,h]); assert.equal(geo.over,0, JSON.stringify({pose,geo}));
   for(const key of ['top','bottom','left','right','toolbar']) assert.ok(geo[key]>=-.6,JSON.stringify({pose,key,geo}));
   assert.ok(Math.abs(geo.barCenter)<1 && geo.barTop>=0 && geo.barTop<24, JSON.stringify({pose,geo}));
   assert.equal(geo.innerSide==='none',pose!=='duo-inner-landscape');
   assert.ok(geo.homeClear && geo.bottomPadding >= 24 && geo.bottomPadding <= 34 && Math.abs(geo.sidebarGap)<.75, JSON.stringify({pose,geo}));
   const statusHeight = pose === 'iphone-18-pro' ? 62 : ['duo-inner-portrait','duo-tabletop'].includes(pose) ? 84 : 0;
   assert.ok(Math.abs(geo.topReserve - statusHeight)<.5, JSON.stringify({pose,geo}));
   const aligned = await page.evaluate(() => {
    const box = selector => document.querySelector(selector).getBoundingClientRect();
    const status = [...document.querySelectorAll('.dp-status')].find(el => el.offsetWidth)?.getBoundingClientRect(), menu = box('.dp-menu'), screen = box('.dp-window');
    const centerX = r => r.left + r.width / 2;
    const centerY = r => r.top + r.height / 2;
    const axis = document.querySelector('#dpDevice').dataset.edge;
    const scale = screen.width / document.querySelector('#dpScreen').clientWidth;
    return {
      delta: !status || axis === 'phone' ? 0 : axis === 'top' ? centerY(status) - centerY(menu) : centerX(status) - centerX(menu),
      railCenter: (screen.right - centerX(menu)) / scale,
      statusClear: !status || (axis === 'top' ? menu.right < status.left : status.bottom <= menu.top + .5),
      icon: Boolean(document.querySelector('#dpBar button[aria-pressed="true"] svg.dp-pose-icon')),
      titleColor: getComputedStyle(document.querySelector('.app-shell h1')).color,
    };
   });
   assert.ok(Math.abs(aligned.delta) < .5, JSON.stringify({pose,aligned}));
   assert.ok(aligned.statusClear && aligned.icon, JSON.stringify({pose,aligned}));
   assert.equal(aligned.titleColor, 'rgb(23, 27, 35)');
   if (pose.startsWith('duo-outer')) assert.ok(Math.abs(aligned.railCenter - 48) < .5);
   if (pose === 'duo-book' || pose === 'duo-tabletop') {
    const separated = await page.evaluate(() => {
     const content = document.querySelector('#dpScreen').getBoundingClientRect();
     const fold = document.querySelector('.dp-fold').getBoundingClientRect();
     return content.right <= fold.left + .5 || content.bottom <= fold.top + .5;
    });
    assert.ok(separated, pose);
   }
   await page.locator('#dpScreen').evaluate(el=>el.scrollTop=480);
   const scroll=()=>page.evaluate(()=>[window.scrollY,document.querySelector('#dpScreen').scrollTop]);
   const before=await scroll();
   await page.locator('#tocBtn2').click();
   assert.deepEqual(await scroll(),before);
   assert.equal(await page.locator('#tocBtn2').getAttribute('aria-expanded'),'true');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'tocClose');
   const overlap=await page.locator('#tocSheet').evaluate(el=>{
    const r=el.getBoundingClientRect(), s=document.querySelector('.dp-window').getBoundingClientRect();
    const b=document.querySelector('#tocBtn2').getBoundingClientRect();
    return r.top<s.top||r.bottom>s.bottom||r.right>s.right||r.left<s.left||
      (r.x<b.right&&b.x<r.right&&r.y<b.bottom&&b.y<r.bottom);
   });
   assert.equal(overlap,false,pose);
   await page.keyboard.press('Shift+Tab');
   await page.keyboard.press('Tab');
   await page.keyboard.press('Escape');
   assert.deepEqual(await scroll(),before);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'tocBtn2');
   await page.locator('#tocBtn2').click();
   await page.locator('#tocList a[href="#matrix"]').click();
   const target=await page.evaluate(()=>[window.scrollY, document.activeElement.id,
     document.querySelector('#matrix').getBoundingClientRect().top - document.querySelector('#dpScreen').getBoundingClientRect().top]);
   assert.equal(target[0],before[0]); assert.equal(target[1],'matrix'); assert.ok(target[2]>=-1&&target[2]<135);
   await page.locator('#tocBtn2').click();
   const beforeListScroll = await scroll();
   await page.locator('#tocList a[href="#sources"]').scrollIntoViewIfNeeded();
   assert.deepEqual(await scroll(),beforeListScroll);
   await page.locator('#tocList a[href="#sources"]').click();
   assert.equal(await page.evaluate(()=>document.activeElement.id),'sources');
   await page.locator('#dpScreen').evaluate(el => el.scrollTop = el.scrollHeight);
   const sourceLink = await page.locator('#sources .src a').last().evaluate(el => {
    const r=el.getBoundingClientRect(), s=document.querySelector('#dpScreen').getBoundingClientRect();
    const top=document.querySelector('.dp-screen .duo-topbar').getBoundingClientRect().bottom;
    const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    const home=document.querySelector('.dp-home').getBoundingClientRect();
    return r.bottom<=Math.min(s.bottom,home.top) && r.top>=Math.max(s.top,top) && el.contains(hit);
   });
   assert.ok(sourceLink, pose + ': final source link remains fully visible and clickable');
   if (shots && viewport.width===1280 && file.includes('调研阅读版')) {
    await select('web');
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await select(pose);
    await page.screenshot({path:resolve(shots,pose)+'.png'});
    await page.locator('#tocBtn2').click();
    await page.screenshot({path:resolve(shots,pose)+'-menu.png'});
    await page.keyboard.press('Escape');
    if (pose === 'duo-inner-landscape') {
     await page.locator('nav a[href="#sources"]').click();
     await page.screenshot({path:resolve(shots,'duo-sources.png')});
    }
   }
  }
 }
 await select('duo-outer-landscape');
 await page.locator('#tocBtn2').click();
 await page.locator('#tocList a[href="#matrix"]').click();
 await page.locator('#fText').fill('场景');
 const first = page.locator('#tbody tr[data-main]').first();
 await first.evaluate(row => {
   const screen = document.querySelector('#dpScreen');
   const bounds = screen.getBoundingClientRect();
   const scale = bounds.width / screen.clientWidth;
   screen.scrollTop += (row.getBoundingClientRect().top - bounds.top) / scale - 170;
 });

 await first.locator("td.scene").click();
 assert.equal(await page.locator('#tbody tr[data-detail]').first().isVisible(),true);
 const selected = () => page.locator('nav a[aria-current]').getAttribute('href');
 const chapter = await selected();
 assert.equal(chapter,'#matrix');
 for (const pose of ['duo-inner-landscape','duo-inner-portrait','huawei-mate-x6-closed','huawei-mate-x6-open','web','duo-outer-landscape']) {
   await select(pose);
   assert.equal(await selected(),chapter);
   assert.equal(await page.locator('#fText').inputValue(),'场景');
   assert.equal(await page.locator('#tbody tr[data-detail]').first().isVisible(),true);
 }
 await select('web');
 await page.setViewportSize({width:390,height:700});
 const originalBar = await page.locator('#dpBar').boundingBox();
 await page.evaluate(() => window.scrollTo({top: 400, behavior: 'instant'}));
 const scrolledBar = await page.locator('#dpBar').boundingBox();
 assert.deepEqual(scrolledBar, originalBar);
 assert.ok(Math.abs(scrolledBar.x + scrolledBar.width / 2 - 195) < 1);
 await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
 await page.locator('#tocBtn').click();
 await page.locator('#tocClose').click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'tocBtn');
 await page.goto(pathToFileURL(resolve(dir,file)).href+'?pose=outer#matrix');
 assert.equal(await page.locator('body').getAttribute('data-dp'),'duo-outer-portrait');
 assert.deepEqual(errors,[]);
 console.log('PASS',file);
 await page.close();
}
const sample = await browser.newPage({viewport:{width:390,height:570}});
const sampleErrors = [];
sample.on('pageerror',e=>sampleErrors.push(e.message));
const starter = resolve(temp, 'starter.html');
writeFileSync(starter, updatePreview(readFileSync(new URL('../assets/preview/starter.html',import.meta.url),'utf8')));
await sample.goto(pathToFileURL(starter).href);
await sample.locator('[data-dp-pose=duo-outer-landscape]').click();
await sample.locator('#tocBtn2').click();
await sample.locator('#tocList a[href="#acceptance"]').click();
assert.equal(await sample.evaluate(()=>document.activeElement.id),'acceptance');
const huawei = JSON.parse(readFileSync(new URL('../assets/preview/poses.json',import.meta.url),'utf8'))
  .filter(pose => pose.family === 'huawei');
await sample.setViewportSize({width:740,height:390});
for (const pose of huawei) {
  await sample.locator('[data-dp-brand=huawei]').click();
  assert.equal(await sample.locator('[data-dp-family=huawei] button:visible').count(), 7);
  await sample.locator(`[data-dp-pose="${pose.id}"]`).click();
  const geometry = await sample.locator('.dp-window').evaluate(window => ({
    width: window.clientWidth,
    height: window.clientHeight,
    overflow: window.querySelector('.dp-screen').scrollWidth - window.clientWidth,
  }));
  assert.deepEqual(geometry, {width:pose.width,height:pose.height,overflow:0});
  assert.match(await sample.locator('#dpCaption').textContent(), /CSS px · 模拟窗口/);
  const status = sample.locator('.dp-huawei-status');
  assert.ok(await status.isVisible());
  assert.equal(await status.textContent(), '9:41');
  await status.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  const levels = await status.locator('.dp-huawei-levels').boundingBox();
  const menu = await sample.locator('#tocBtn2').boundingBox();
  assert.ok(levels.x + levels.width <= menu.x);
  assert.ok(await sample.locator('#dpFrame').evaluate(async image => {
    await image.decode();
    return image.naturalWidth > 0;
  }));
  await sample.locator('#tocBtn2').click();
  await sample.locator('#tocList a[href="#acceptance"]').click();
  assert.equal(await sample.evaluate(()=>document.activeElement.id),'acceptance');
}
await sample.goto(pathToFileURL(starter).href+'?pose=huawei-pura-x-closed');
assert.equal(await sample.locator('body').getAttribute('data-dp'),'huawei-pura-x-closed');
await sample.locator('[data-dp-brand=apple]').click();
assert.equal(await sample.locator('[data-dp-family=apple] button:visible').count(), 7);
await sample.locator('[data-dp-pose=duo-book]').click();
await sample.locator('[data-dp-brand=huawei]').click();
assert.equal(await sample.locator('body').getAttribute('data-dp'),'huawei-pura-x-closed');
await sample.locator('[data-dp-brand=apple]').click();
assert.equal(await sample.locator('body').getAttribute('data-dp'),'duo-book');
assert.deepEqual(sampleErrors,[]);
console.log('PASS starter');
} finally {await browser.close(); rmSync(temp, { recursive:true, force:true });}
