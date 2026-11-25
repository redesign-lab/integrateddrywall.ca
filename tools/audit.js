/* Structured page audit: overflow, console errors, image health, heading order, contrast, assets. */
const puppeteer = require('/tmp/qa/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');
const url = 'file://' + path.resolve(__dirname, '../index.html');
const widths = [320, 360, 390, 430, 480, 600, 768, 834, 1024, 1180, 1280, 1440, 1680, 1920];

function lum(hex) {
  const c = hex.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) { const l1 = Math.max(lum(a), lum(b)), l2 = Math.min(lum(a), lum(b)); return (l1 + 0.05) / (l2 + 0.05); }

(async () => {
  const b = await puppeteer.launch({ executablePath: '/tmp/chromium', headless: 'shell',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--allow-file-access-from-files'] });
  const rows = [];
  for (const w of widths) {
    const p = await b.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('requestfailed', r => errs.push('reqfailed: ' + r.url().split('/').pop()));
    await p.setViewport({ width: w, height: 900, isMobile: w < 900, hasTouch: w < 900 });
    await p.goto(url, { waitUntil: 'networkidle0' });
    // force-load lazy images, then wait until every one has decoded
    await p.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; }));
    await p.evaluate(() => new Promise(res => { let y = 0; const t = setInterval(() => { window.scrollBy(0, 800); y += 900; if (y > document.body.scrollHeight + 900) { clearInterval(t); setTimeout(res, 300); } }, 25); }));
    await p.evaluate(async () => {
      const wait = (img) => new Promise(r => { if (img.complete && img.naturalWidth) return r(); img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); setTimeout(r, 5000); });
      await Promise.all([...document.images].map(wait));
    });
    const res = await p.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const over = [];
      document.querySelectorAll('body *').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
        if (el.closest('.drawer') || el.closest('[aria-hidden="true"]')) return;
        if (r.right > vw + 1 || r.left < -1) over.push((el.tagName + '.' + (el.className || '').toString().split(' ')[0]).slice(0, 42));
      });
      const headings = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1]);
      let jumps = [];
      for (let i = 1; i < headings.length; i++) if (headings[i] - headings[i - 1] > 1) jumps.push(headings[i - 1] + '->' + headings[i]);
      const broken = [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.getAttribute('src'));
      const alts = [...document.images].filter(i => !i.hasAttribute('alt')).length;
      const labelCheck = [...document.querySelectorAll('input,select,textarea')].filter(el => {
        if (el.type === 'hidden') return false;
        const id = el.id;
        return !(id && document.querySelector(`label[for="${id}"]`)) && !el.getAttribute('aria-label');
      }).length;
      return {
        vw, scrollW: document.documentElement.scrollWidth,
        overflow: [...new Set(over)].slice(0, 6),
        h1: document.querySelectorAll('h1').length,
        headingJumps: [...new Set(jumps)],
        broken, missingAlt: alts, unlabeled: labelCheck,
        docHeight: document.body.scrollHeight
      };
    });
    rows.push({ w, ...res, errors: errs });
    await p.close();
  }
  await b.close();
  let bad = 0;
  for (const r of rows) {
    const problems = [];
    if (r.scrollW > r.vw + 1) problems.push('h-scroll ' + r.scrollW + '>' + r.vw);
    if (r.overflow.length) problems.push('overflow: ' + r.overflow.join(','));
    if (r.errors.length) problems.push('errors: ' + r.errors.join(' | '));
    if (r.broken.length) problems.push('broken: ' + r.broken.join(','));
    if (r.missingAlt) problems.push('missing alt: ' + r.missingAlt);
    if (r.unlabeled) problems.push('unlabeled fields: ' + r.unlabeled);
    if (r.h1 !== 1) problems.push('h1 count: ' + r.h1);
    if (r.headingJumps.length) problems.push('heading jumps: ' + r.headingJumps.join(','));
    if (problems.length) bad++;
    console.log(String(r.w).padStart(4) + 'px  ' + (problems.length ? 'FAIL  ' + problems.join('  ·  ') : 'ok    (doc ' + r.docHeight + 'px)'));
  }
  // contrast samples
  const p2 = await b;
  console.log('\nContrast (WCAG AA needs 4.5 body / 3.0 large):');
  const samples = [
    ['body ink on bone', [14,15,15], [242,240,235]],
    ['muted grey on bone', [91,95,96], [242,240,235]],
    ['ink on accent', [14,15,15], [223,165,60]],
    ['bone on ink', [242,240,235], [14,15,15]],
    ['hero lede (0.86 bone) on ink', [213,211,207], [14,15,15]],
    ['footer link (0.82 bone) on ink', [201,199,195], [14,15,15]],
    ['service tag #3E4243 on bone-2', [62,66,67], [232,229,222]],
    ['card muted on bone', [91,95,96], [242,240,235]]
  ];
  for (const [name, fg, bg] of samples) {
    const c = ratio(fg, bg);
    console.log((c >= 4.5 ? 'PASS ' : c >= 3 ? 'LARGE-ONLY ' : 'FAIL ') + c.toFixed(2) + ':1  ' + name);
  }
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(2); });
