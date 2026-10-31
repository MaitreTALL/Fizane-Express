// Mobile audit of the Tondraaga shop: screenshots (390 px wide, in slices), horizontal
// overflow, visible English texts, broken images, console errors and failed requests.
//   node shoot.cjs pages.json out/
const fs = require('fs');
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('playwright-core'); }
const { chromium } = pw;

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = process.argv[3];
fs.mkdirSync(out, { recursive: true });
const W = 390, H = 844, SLICE = 1400, MAX_SLICES = 5;
const UA = 'Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 TondraagaApp/1.0';

const ENGLISH = /\b(the|and|your|you|my|store|stores|orders?|dashboard|vendors?|products?|add to cart|cart|checkout|log ?in|log ?out|register|password|search|view|details|save|submit|cancel|update|subscriptions?|pack|withdraw|settings|shop|price|quantity|shipping|apply|remove|continue|back|next|previous|home|account|sign (in|up)|welcome|hello|world|read more|select|choose|showing|results|sort by|sorting|out of stock|in stock|related|reviews?|additional information|lost your password|remember me|username|first name|last name|billing|city|country|postcode|order notes|place order|privacy policy|terms|no products|found|follow|enquiry|vacation|support ticket|request|quote|store list|my orders|onboarding|get started|skip|upload|choose file|no file chosen|filter|reset|clear|all|items?|per page|page \d+ of|of \d+|by|for|with|from|this|that|is|are|was|have|has|not|will|can|please)\b/i;

(async () => {
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const report = [];
  for (const [name, url, before] of cfg.pages) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: UA, locale: 'fr-FR' });
    const page = await ctx.newPage();
    const errors = [], failed = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 200)));
    page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().slice(0, 160)); });
    const entry = { name, url };
    try {
      if (before) await page.goto(cfg.base + before, { waitUntil: 'networkidle', timeout: 60000 });
      const resp = await page.goto(cfg.base + url, { waitUntil: 'networkidle', timeout: 60000 });
      entry.status = resp ? resp.status() : null;
      entry.finalUrl = page.url();
      await page.waitForTimeout(1500);
      // scroll through the page so lazy images and reveal animations play
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(800);
      Object.assign(entry, await page.evaluate(([src, vw]) => {
        const re = new RegExp(src, 'i');
        const res = { title: document.title, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, overflow: [], english: [], brokenImages: [] };
        const label = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && (r.right > vw + 2 || r.left < -2) && cs.position !== 'fixed') {
            let p = el.parentElement, clipped = false;
            while (p && p !== document.body) { const pc = getComputedStyle(p); if (/(hidden|auto|scroll|clip)/.test(pc.overflowX)) { clipped = true; break; } p = p.parentElement; }
            if (!clipped) res.overflow.push(label(el) + ' L' + Math.round(r.left) + ' R' + Math.round(r.right));
          }
        }
        res.overflow = res.overflow.slice(0, 15);
        const seen = new Set();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
          const t = n.nodeValue.replace(/\s+/g, ' ').trim();
          if (t.length < 3 || seen.has(t)) continue;
          const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
          const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          if (re.test(t)) { seen.add(t); res.english.push(t.slice(0, 140)); }
        }
        for (const el of document.querySelectorAll('[placeholder],[title],[aria-label],input[type=submit],input[type=button],option')) {
          for (const v of [el.getAttribute('placeholder'), el.getAttribute('title'), el.getAttribute('aria-label'), el.tagName === 'INPUT' ? el.value : null, el.tagName === 'OPTION' ? el.textContent : null]) {
            if (v && v.trim().length > 2 && !seen.has(v) && re.test(v)) { seen.add(v); res.english.push('[attr] ' + v.trim().slice(0, 120)); }
          }
        }
        res.english = res.english.slice(0, 60);
        for (const img of document.images) if (img.complete && img.naturalWidth === 0 && img.src) res.brokenImages.push(img.src.slice(0, 160));
        return res;
      }, [ENGLISH.source, W]));
      const h = entry.height;
      entry.slices = [];
      for (let i = 0; i < Math.min(MAX_SLICES, Math.ceil(h / SLICE)); i++) {
        const file = `${name}-${i + 1}.png`;
        await page.screenshot({ path: path.join(out, file), fullPage: true, clip: { x: 0, y: i * SLICE, width: W, height: Math.min(SLICE, h - i * SLICE) } });
        entry.slices.push(file);
      }
    } catch (e) {
      entry.error = String(e).slice(0, 300);
    }
    entry.consoleErrors = errors.slice(0, 10);
    entry.failedRequests = [...new Set(failed)].slice(0, 10);
    report.push(entry);
    console.log(name, entry.status, entry.error || '', 'overflow:', (entry.overflow || []).length, 'english:', (entry.english || []).length);
    await ctx.close();
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  await browser.close();
})();
