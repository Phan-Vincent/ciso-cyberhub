// Optional browser gate. Run on a machine with Playwright + Chromium installed.
// Start the site first with npm run dev. This file is not included in node --test.
// Set PLAYWRIGHT_EXECUTABLE to a Chromium binary when Playwright's own download is absent.
import assert from 'node:assert/strict';
import {createRequire}from'node:module';
const require=createRequire(import.meta.url);
const {chromium}=process.env.PLAYWRIGHT_MODULE?require(process.env.PLAYWRIGHT_MODULE):await import('playwright');
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4321';
const overlaps=async(page,a,b)=>page.evaluate(([sa,sb])=>{const x=document.querySelector(sa),y=document.querySelector(sb);if(!x||!y)return true;const a=x.getBoundingClientRect(),b=y.getBoundingClientRect();if(!a.width||!b.width)return false;return !(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);},[a,b]);
// Data pages fill their panels after a JSON fetch; wait for the rendered text instead of reading immediately.
const waitText=(page,selector,re)=>page.waitForFunction(([s,src])=>{const el=document.querySelector(s);return !!el&&new RegExp(src).test(el.textContent||'');},[selector,re.source],{timeout:15000});
const launch={headless:true};
if(process.env.PLAYWRIGHT_EXECUTABLE)launch.executablePath=process.env.PLAYWRIGHT_EXECUTABLE;
const browser=await chromium.launch(launch);
try {
 const context=await browser.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/');assert.equal(await page.locator('h1').count(),1);

 // Theme: explicit choice persists across reload and navigation, and exposes state.
 const initial=await page.evaluate(()=>document.documentElement.dataset.theme);
 const pressed=await page.locator('#theme').getAttribute('aria-pressed');
 assert.equal(pressed,String(initial==='dark'));
 await page.locator('#theme').click();
 const chosen=await page.evaluate(()=>document.documentElement.dataset.theme);
 assert.notEqual(chosen,initial);
 assert.equal(await page.locator('#theme').getAttribute('aria-pressed'),String(chosen==='dark'));
 await page.reload();
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),chosen);
 await page.goto(origin+'/tools/');
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),chosen);

 // Hero: HUB sits left under CYBER and the map never crosses the type block.
 await page.goto(origin+'/');
 for(const width of [1440,1024,768]){await page.setViewportSize({width,height:900});await page.waitForTimeout(150);assert.equal(await overlaps(page,'#hero-title','#seal'),false,`hero/map overlap at ${width}`);}
 const lines=await page.evaluate(()=>{const a=document.querySelector('#hero-title .ln-1').getBoundingClientRect(),b=document.querySelector('#hero-title .ln-2').getBoundingClientRect();return {leftDiff:Math.abs(a.left-b.left),below:b.top>=a.top};});
 assert.ok(lines.leftDiff<2,'HUB is not left-aligned with CYBER');assert.ok(lines.below,'HUB is not below CYBER');
 // Hero type settles at its CSS size once fonts resolve and holds it across theme and reload.
 await page.setViewportSize({width:1440,height:900});await page.goto(origin+'/');
 const heroFont=()=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>setTimeout(r,200));return parseFloat(getComputedStyle(document.querySelector('#hero-title .ln-1')).fontSize);});
 const settled=await heroFont();
 assert.ok(settled>180,`hero type is too small at desktop (${settled}px)`);
 await page.locator('#theme').click();
 assert.ok(Math.abs(await heroFont()-settled)<=1,'hero type resizes on theme toggle');
 await page.reload();
 assert.ok(Math.abs(await heroFont()-settled)<=1,'hero type resizes on reload');
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/');assert.equal(await overlaps(page,'#hero-title','#seal'),false,'hero/map overlap on phone');
 assert.match(await page.locator('#seal').getAttribute('aria-label'),/simulated/i);
 // The globe keeps a real slot under the hero copy on phones: visible, below the copy, above the meta row, inside the viewport.
 const phone=await page.evaluate(()=>{const r=(s)=>{const el=document.querySelector(s);return el?el.getBoundingClientRect():null;};const seal=r('#seal'),intro=r('.hero-intro'),meta=r('.hero-meta');return seal&&intro&&meta?{w:seal.width,h:seal.height,top:seal.top,bottom:seal.bottom,introBottom:intro.bottom,metaTop:meta.top,vh:innerHeight}:null;});
 assert.ok(phone,'phone hero geometry missing');
 assert.ok(phone.w>80&&phone.h>80,`globe is not rendered on phone (${phone&&phone.w}x${phone&&phone.h})`);
 assert.ok(phone.top>=phone.introBottom-1,'globe overlaps hero copy on phone');
 assert.ok(phone.bottom<=phone.metaTop+1,'globe overlaps hero meta on phone');
 assert.ok(phone.bottom<=phone.vh,'globe overflows phone viewport');
 // Phones skip the decorative learning map and keep the homepage short.
 assert.equal(await page.locator('#map').isVisible(),false,'learning map should be hidden on phones');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight/innerHeight)<9,'phone homepage is too long');

 // Footer sign-off: two complete lockups in equal shared frames; corners come from CSS, not the SVG.
 await page.setViewportSize({width:1440,height:900});
 await page.locator('.foot-lockup').scrollIntoViewIfNeeded();
 const frame=await page.evaluate(()=>{const els=[...document.querySelectorAll('.brand-frame')];const boxes=els.map(el=>el.getBoundingClientRect());const corner=els.map(el=>getComputedStyle(el).getPropertyValue('--corner-len').trim());const weight=els.map(el=>getComputedStyle(el).getPropertyValue('--corner-weight').trim());const before=els.map(el=>getComputedStyle(el,'::before'));const lockup=document.querySelector('.foot-lockup');return {count:els.length,widths:boxes.map(b=>Math.round(b.width)),heights:boxes.map(b=>Math.round(b.height)),tops:boxes.map(b=>Math.round(b.top)),bottoms:boxes.map(b=>Math.round(b.bottom)),border:getComputedStyle(els[0]).borderTopWidth,layers:before.map(b=>(b.backgroundImage.match(/linear-gradient/g)||[]).length),corner,weight,align:getComputedStyle(lockup).alignItems};});
 assert.equal(frame.count,2,'footer must render two brand lockups');
 assert.ok(Math.abs(frame.widths[0]-frame.widths[1])<=1,`lockup widths differ (${frame.widths})`);
 assert.ok(Math.abs(frame.heights[0]-frame.heights[1])<=1,`lockup heights differ (${frame.heights})`);
 assert.ok(Math.abs(frame.tops[0]-frame.tops[1])<=1&&Math.abs(frame.bottoms[0]-frame.bottoms[1])<=1,'lockup frames are not aligned');
 assert.ok(frame.layers.every(n=>n>=4),'blue corner brackets missing on a lockup frame');
 assert.equal(frame.corner[0],frame.corner[1],'lockup corner lengths differ');
 assert.equal(frame.weight[0],frame.weight[1],'lockup corner weights differ');
 assert.ok(frame.corner[0]&&frame.weight[0],'shared corner dimensions are unset');
 assert.equal(frame.border,'0px','lockup frame must not draw a complete border');
 assert.equal(frame.align,'stretch','footer lockup frames are not aligned top and bottom');

 // Today: real headlines with sources and dates, and live counts.
 await page.goto(origin+'/');await page.locator('#today').scrollIntoViewIfNeeded();
 const today=await page.evaluate(()=>{const items=[...document.querySelectorAll('.today-news li')];const a=items[0]?.querySelector('a');return {n:items.length,href:a?.href||'',meta:items[0]?.querySelector('.label')?.textContent||'',stats:document.querySelectorAll('.today-stat').length};});
 assert.ok(today.n>=1,'no headlines on the homepage');assert.match(today.href,/^https:\/\//,'headline is not an external source');
 assert.match(today.meta,/\d{4}-\d{2}-\d{2}/,'headline lacks a date');assert.equal(today.stats,3);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight/innerHeight)<7,'desktop homepage is too long');

 // Globe drag: pointer input rotates both axes, persists across release, and stops autospin conflict.
 await page.goto(origin+'/');await page.waitForSelector('#core-canvas[data-ready="ready"]',{timeout:20000});
 const globe=page.locator('#core-canvas'),gb=await globe.boundingBox();assert.ok(gb,'globe canvas has no box');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#core-canvas')).touchAction),'none','globe must own touch gestures');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#core-canvas')).cursor),'grab','globe must offer a grab cursor');
 await page.mouse.move(gb.x+gb.width*.5,gb.y+gb.height*.5);await page.mouse.down();
 const dragStart=await globe.getAttribute('data-drag-yaw');
 await page.mouse.move(gb.x+gb.width*.5+140,gb.y+gb.height*.5+70,{steps:8});
 assert.equal(await globe.getAttribute('data-dragging'),'true');
 const dragYaw=await globe.getAttribute('data-drag-yaw'),dragPitch=await globe.getAttribute('data-drag-pitch');
 await page.mouse.up();
 assert.equal(await globe.getAttribute('data-dragging'),'false');
 assert.notEqual(dragYaw,dragStart,'horizontal drag did not rotate the globe');
 assert.notEqual(dragPitch,'0.0000','vertical drag did not rotate the globe');
 await page.waitForTimeout(600);
 assert.equal(await globe.getAttribute('data-drag-yaw'),dragYaw,'drag orientation did not persist after release');
 assert.equal(await globe.getAttribute('data-drag-pitch'),dragPitch,'drag pitch did not persist after release');

 // Path cards and hands-on tiles: every link goes somewhere real and nothing overlaps.
 for(const width of [1440,1024,390]){
  await page.setViewportSize({width,height:900});await page.goto(origin+'/');
  assert.equal(await page.locator('.path-card').count(),4,'four starting paths');assert.equal(await page.locator('#now .play-tile').count(),6,'six hands-on tiles');
  assert.equal(await overlaps(page,'.path-card:nth-child(1)','.path-card:nth-child(2)'),false,`path cards overlap at ${width}`);
 }
 await page.setViewportSize({width:1440,height:900});

 // Tools filtering and quiz behavior.
 await page.goto(origin+'/tools/');await page.locator('[name=q]').fill('wireshark');await page.waitForTimeout(100);assert.equal(await page.locator('[data-record]:visible').count(),1);
 await page.locator('[name=q]').fill('no-such-tool');assert.equal(await page.locator('[data-record]:visible').count(),0);

 // Flashcards: click, Enter, Space, counts and reset to front on next/previous.
 await page.goto(origin+'/academy/flashcards/');
 await waitText(page,'#card-count',/^1 \/ \d+ · Objective /);
 await page.waitForFunction(()=>{const el=document.querySelector('#card-text');return !!el&&(el.textContent||'').trim().length>0;},undefined,{timeout:15000});
 const card=page.locator('#card-text');
 const front=await card.textContent();
 assert.match(await page.locator('#card-count').textContent(),/^1 \/ \d+ · Objective /);
 assert.equal(await card.getAttribute('aria-pressed'),'false');
 await card.click();
 assert.notEqual(await card.textContent(),front);
 assert.equal(await card.getAttribute('aria-pressed'),'true');
 await card.press('Enter');
 assert.equal(await card.textContent(),front);
 assert.equal(await card.getAttribute('aria-pressed'),'false');
 await card.press('Space');
 assert.notEqual(await card.textContent(),front);
 await page.locator('#next-card').click();
 assert.match(await page.locator('#card-count').textContent(),/^2 \/ \d+ · Objective /);
 assert.equal(await card.getAttribute('aria-pressed'),'false','next card must show its front');
 assert.notEqual(await card.textContent(),front);
 await page.locator('#previous-card').click();
 assert.match(await page.locator('#card-count').textContent(),/^1 \/ \d+ · Objective /);
 assert.equal(await card.getAttribute('aria-pressed'),'false','previous card must show its front');
 assert.equal(await card.textContent(),front);
 await page.locator('#flip').click();
 assert.notEqual(await card.textContent(),front);
 assert.equal(await card.getAttribute('aria-pressed'),'true');

 // Quiz and local progress persistence.
 await page.goto(origin+'/academy/practice/');await page.waitForFunction(()=>!!document.querySelector('#quiz-questions[data-ready]'),undefined,{timeout:15000});await page.locator('#start-quiz').click();assert.equal(await page.locator('fieldset').count(),28);await page.locator('#submit-quiz').click();assert.match(await page.locator('#quiz-result').textContent(),/0 \/ 28/);
 await page.goto(origin+'/academy/choosing-security-controls/');await page.locator('#complete').click();await page.reload();assert.equal(await page.locator('#complete').getAttribute('aria-pressed'),'true');

 // Search and mobile overflow.
 const searchReady=page.waitForResponse(r=>r.url().endsWith('search.json'));await page.goto(origin+'/search/');await searchReady;await page.locator('#global-search').fill('Wireshark');await waitText(page,'#status',/search results/);await page.waitForFunction(()=>document.querySelectorAll('#search-results li').length>0,undefined,{timeout:15000});assert.ok(await page.locator('#search-results li').count()>0);
 await page.setViewportSize({width:390,height:844});for(const path of ['/','/tools/','/academy/','/labs/packet-analysis/']){await page.goto(origin+path);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Horizontal overflow: ${path}`);}

 // System preference applies only while no explicit choice exists.
 for(const scheme of ['light','dark']){const c=await browser.newContext({colorScheme:scheme});const p=await c.newPage();await p.goto(origin+'/');assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),scheme);await c.close();}

 assert.deepEqual(errors,[]);console.log('Browser smoke tests passed: theme, hero/map separation, homepage paths and today, navigation, filtering, quiz, persistence, flashcards, search and mobile overflow.');
}finally{await browser.close();}
