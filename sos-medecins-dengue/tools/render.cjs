// Frame-accurate renderer: drives src/index.html in headless Chromium and
// pipes each frame into ffmpeg.
//
//   node tools/render.cjs stills <out-dir> <t1,t2,...>
//   node tools/render.cjs segment <out.mp4> <firstFrame> <lastFrameExclusive>
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png' };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function open(server) {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'],
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/src/${process.env.PAGE || 'index.html'}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  return { browser, page };
}

(async () => {
  const [mode, out, a, b] = process.argv.slice(2);
  const server = await serve();
  const { browser, page } = await open(server);
  const fps = await page.evaluate(() => window.__fps);
  const stage = await page.$('#stage');

  if (mode === 'cues') {
    const cues = await page.evaluate(() => window.__cues);
    fs.writeFileSync(out, JSON.stringify(cues));
    console.log(`${cues.length} cues -> ${out}`);
  } else if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true });
    for (const t of a.split(',').map(Number)) {
      const t0 = Date.now();
      await page.evaluate((t) => window.renderAt(t), t);
      await stage.screenshot({ path: path.join(out, `t${t.toFixed(2).padStart(6, '0')}.png`) });
      console.log(`t=${t}s rendered in ${Date.now() - t0} ms`);
    }
  } else if (mode === 'segment') {
    const f0 = Number(a), f1 = Number(b);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const cdp = await page.context().newCDPSession(page);
    const tStart = Date.now();
    for (let f = f0; f < f1; f++) {
      await page.evaluate((t) => window.renderAt(t), f / fps);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94, optimizeForSpeed: true, clip: { x: 0, y: 0, width: 1080, height: 1920, scale: 1 } });
      const buf = Buffer.from(data, 'base64');
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if ((f - f0) % 60 === 0) {
        const done = f - f0 + 1, el = (Date.now() - tStart) / 1000;
        console.log(`[${path.basename(out)}] frame ${f} (${done}/${f1 - f0}) ${(el / done).toFixed(2)} s/frame`);
      }
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
  }
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
