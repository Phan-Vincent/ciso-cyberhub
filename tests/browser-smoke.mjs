// Optional browser gate. Run on a machine with Playwright + Chromium installed.
// Start the site first with npm run dev. This file is not included in node --test.
import assert from 'node:assert/strict';
import {createRequire}from'node:module';
const require=createRequire(import.meta.url);
const {chromium}=process.env.PLAYWRIGHT_MODULE?require(process.env.PLAYWRIGHT_MODULE):await import('playwright');
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4321';
 await page.goto(origin+'/');assert.equal(await page.locator('h1').count(),1);
 await page.goto(origin+'/tools/');await page.locator('[name=q]').fill('wireshark');await page.waitForTimeout(100);assert.equal(await page.locator('[data-record]:visible').count(),1);
 await page.locator('[name=q]').fill('no-such-tool');assert.equal(await page.locator('[data-record]:visible').count(),0);
 await page.goto(origin+'/academy/practice/');await page.locator('#start-quiz').click();assert.equal(await page.locator('fieldset').count(),28);await page.locator('#submit-quiz').click();assert.match(await page.locator('#quiz-result').textContent(),/0 \/ 28/);
 await page.goto(origin+'/academy/choosing-security-controls/');await page.locator('#complete').click();await page.reload();assert.equal(await page.locator('#complete').getAttribute('aria-pressed'),'true');
 await page.goto(origin+'/academy/flashcards/');const front=await page.locator('#card-text').textContent();await page.locator('#flip').click();assert.notEqual(await page.locator('#card-text').textContent(),front);
 const searchReady=page.waitForResponse(r=>r.url().endsWith('search.json'));await page.goto(origin+'/search/');await searchReady;await page.locator('#global-search').fill('Wireshark');assert.ok(await page.locator('#search-results li').count()>0);
 await page.setViewportSize({width:390,height:844});for(const path of ['/','/tools/','/academy/','/labs/packet-analysis/']){await page.goto(origin+path);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Horizontal overflow: ${path}`);}
 assert.deepEqual(errors,[]);console.log('Browser smoke tests passed: navigation, filtering, quiz, persistence, flashcards, search and mobile overflow.');
}finally{await browser.close();}
