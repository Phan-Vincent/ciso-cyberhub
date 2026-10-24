// Renders the 1200x630 link-preview cards in public/assets/og/ from scripts/og/cards.json.
// Developer tool only (needs Playwright); the site build itself stays dependency-free.
// Run: node scripts/og/render_cards.mjs   (PLAYWRIGHT_MODULE / PLAYWRIGHT_EXECUTABLE optional)
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : await import('playwright');
const root = new URL('../../', import.meta.url);
const asset = p => new URL(`public/assets/${p}`, root).href;
const cards = JSON.parse(readFileSync(new URL('scripts/og/cards.json', root), 'utf8'));
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const html = c => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Archivo;src:url(${asset('fonts/archivo.woff2')}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:Martian;src:url(${asset('fonts/martian-mono.woff2')}) format('woff2');font-weight:100 800;font-stretch:75% 112.5%}
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;overflow:hidden;background:#050505;color:#fff;font-family:Archivo,sans-serif;position:relative}
.grid{position:absolute;inset:0;background:repeating-linear-gradient(to right,rgba(255,255,255,.05) 0 1px,transparent 1px 100px)}
.core{position:absolute;right:-110px;top:44%;width:540px;height:540px;transform:translateY(-50%);opacity:.9}
.glow{position:absolute;right:-60px;top:40px;width:560px;height:560px;border-radius:50%;background:radial-gradient(circle,rgba(0,104,188,.35),transparent 65%)}
.tag,.kick,.foot{font-family:Martian,monospace;font-stretch:87.5%;letter-spacing:.08em;text-transform:uppercase;font-size:17px}
.tag{position:absolute;left:64px;top:56px;color:#8d929c}.tag b{color:#3b93ff;font-weight:400}
.kick{position:absolute;left:64px;top:150px;color:#3b93ff}
h1{position:absolute;left:58px;top:186px;font-weight:830;font-stretch:62%;text-transform:uppercase;line-height:.86;letter-spacing:-.01em;font-size:132px;max-width:820px}
h1 span{display:block}h1 span+span{color:transparent;-webkit-text-stroke:3px #3b93ff}
p{position:absolute;left:64px;top:452px;width:640px;font-size:27px;line-height:1.3;color:#c9ccd2}
.foot{z-index:2;position:absolute;left:64px;right:64px;bottom:44px;display:flex;justify-content:space-between;color:#8d929c;border-top:1px solid rgba(255,255,255,.18);padding-top:18px}
.foot span{background:#050505;padding:0 0 0 0}.foot span:last-child{padding-left:14px}.foot img{height:30px;vertical-align:middle;margin-right:12px}.reg{position:absolute;width:26px;height:26px;border-color:#3b93ff;border-style:solid}
.r1{left:28px;top:28px;border-width:2px 0 0 2px}.r2{right:28px;top:28px;border-width:2px 2px 0 0}.r3{left:28px;bottom:28px;border-width:0 0 2px 2px}.r4{right:28px;bottom:28px;border-width:0 2px 2px 0}
</style></head><body><div class="grid"></div><div class="glow"></div><img class="core" src="${asset('brand/cyberhub-core-on-dark.svg')}">
<span class="reg r1"></span><span class="reg r2"></span><span class="reg r3"></span><span class="reg r4"></span>
<div class="tag">CyberHub <b>/</b> ${esc(c.tag)}</div><div class="kick">${esc(c.kicker)}</div>
<h1>${c.title.map(t => `<span>${esc(t)}</span>`).join('')}</h1><p>${esc(c.sub)}</p>
<div class="foot"><span><img src="${asset('brand/ciso-seal.png')}">Powered by CISO at CSUSB</span><span>Free · No account · Open source</span></div></body></html>`;
const launch = { headless: true }; if (process.env.PLAYWRIGHT_EXECUTABLE) launch.executablePath = process.env.PLAYWRIGHT_EXECUTABLE;
const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const tmp = mkdtempSync(join(tmpdir(), 'og-'));
for (const c of cards) {
  const file = join(tmp, `${c.id}.html`); writeFileSync(file, html(c));
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: new URL(`public/assets/og/${c.id}.png`, root).pathname });
  console.log('card', c.id);
}
await browser.close();
