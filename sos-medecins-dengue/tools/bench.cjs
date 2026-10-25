// quick render benchmark: node tools/bench.cjs <t> <n> [query]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const [t, n, ...qs] = process.argv.slice(2);
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    const ext = path.extname(p);
    res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' }[ext] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  }).listen(0);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const q of qs.length ? qs : ['']) {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    await page.goto(`http://127.0.0.1:${server.address().port}/src/index.html?${q}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const ms = await page.evaluate(([t, n]) => window.__bench(Number(t), Number(n)), [t, n]);
    console.log(`t=${t} [${q || 'default'}] ${ms.toFixed(0)} ms/frame`);
    await page.close();
  }
  await browser.close(); server.close();
})();
