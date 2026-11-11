// Review screenshots of the site: node tools/shots.mjs <outDir> [lang] [width] [height]
import { chromium } from '/Users/yenniferizariza/lemo-opuscar/node_modules/playwright-core/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)), '..'); const [out, lang = 'es', w = '1280', h = '800'] = process.argv.slice(2);
const MIME = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', jpg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4', vtt: 'text/vtt', ttf: 'font/ttf' };
const srv = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[f.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port;
const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROME, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }); const pg = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await pg.goto(`http://127.0.0.1:${port}/?lang=${lang}`); await pg.waitForTimeout(900);
const shot = async n => pg.screenshot({ path: `${out}/${lang}_${w}_${n}.jpg`, quality: 70, type: 'jpeg' });
await shot('00_hero');
const ids = ['why', 'factors', 'products', 'videos', 'certs', 'contact'];
for (const id of ids) { await pg.evaluate(i => document.getElementById(i).scrollIntoView(), id); await pg.waitForTimeout(900); await shot(id); }
for (const f of (process.env.JF ? process.env.JF.split(',').map(Number) : [0.03, 0.2, 0.34, 0.5, 0.64, 0.78, 0.95])) { await pg.evaluate(f => { const s = document.getElementById('journey'); scrollTo(0, s.offsetTop + (s.offsetHeight - innerHeight) * f); }, f); await pg.waitForTimeout(1100); await shot('j' + String(Math.round(f * 1000)).padStart(4, '0')); }
const ov = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, empty: [...document.querySelectorAll('[data-i18n]')].filter(e => !e.textContent.trim()).length }));
console.log(JSON.stringify({ errs, ov })); await b.close(); srv.close();
