const puppeteer = require('/tmp/qa/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');
const url = 'file://' + path.resolve(__dirname, '../index.html');
const W = +(process.env.W || 390), H = +(process.env.H || 844);
const outDir = process.env.OUT || '/tmp/qa/shots';
const dpr = +(process.env.DPR || 2);
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const b = await puppeteer.launch({ executablePath: '/tmp/chromium', headless: 'shell',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setViewport({ width: W, height: H, deviceScaleFactor: dpr, isMobile: W < 900, hasTouch: W < 900 });
  await p.goto(url, { waitUntil: 'networkidle0' });
  // make everything visible for capture
  await p.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important}' });
  await p.evaluate(async () => {
    await new Promise(r => { let y = 0; const t = setInterval(() => { window.scrollBy(0, 700); y += 700; if (y > document.body.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); setTimeout(r, 300); } }, 30); });
  });
  // wait for every image (bounded) so captures never show placeholders
  await p.evaluate(async () => {
    const wait = (img) => new Promise(res => {
      if (img.complete && img.naturalWidth) return res();
      const done = () => res();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      setTimeout(done, 4000);
    });
    document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
    await Promise.all([...document.images].map(wait));
  });
  await new Promise(r => setTimeout(r, 700));
  await p.addStyleTag({ content: '.site-header,.float-actions{display:none!important}' });
  await new Promise(r => setTimeout(r, 150));
  const tag = `${W}`;
  await p.screenshot({ path: `${outDir}/${tag}-hero.png` });

  // force every image to decode by momentarily using a very tall viewport
  const docH = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.setViewport({ width: W, height: Math.min(docH + 100, 9000), deviceScaleFactor: dpr, isMobile: W < 900, hasTouch: W < 900 });
  await p.evaluate(async () => {
    const wait = (img) => new Promise(res => {
      if (img.complete && img.naturalWidth) return res();
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
      setTimeout(res, 3000);
    });
    await Promise.all([...document.images].map(wait));
  });
  await new Promise(r => setTimeout(r, 400));
  await p.setViewport({ width: W, height: H, deviceScaleFactor: dpr, isMobile: W < 900, hasTouch: W < 900 });
  await new Promise(r => setTimeout(r, 300));
  const decodeFailures = await p.evaluate(() => [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.getAttribute('src')));
  if (decodeFailures.length) console.log('BROKEN IMAGES:', decodeFailures.join(', '));

  const targets = process.env.TARGETS ? process.env.TARGETS.split(',') : ['.trust','.intro','.services','.process','.work','.areas','.quote','.faq','.cta-final','.site-footer'];
  for (const sel of targets) {
    const el = await p.$(sel);
    if (!el) { console.log('missing', sel); continue; }
    const name = sel.replace(/[^a-z0-9]/gi, '');
    try {
      await el.screenshot({ path: `${outDir}/${tag}-${name}.png` });
    } catch (e) { console.log('shot fail', sel, e.message); }
  }
  await b.close();
  console.log('done', W);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
