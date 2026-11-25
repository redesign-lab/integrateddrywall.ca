/* Measures real rendered text contrast for every text node in the page. */
const puppeteer = require('/tmp/qa/node_modules/puppeteer-core');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const b = await puppeteer.launch({ executablePath: '/tmp/chromium', headless: 'shell',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(url, { waitUntil: 'networkidle0' });
  await p.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important}' });
  const out = await p.evaluate(() => {
    const parse = c => c.match(/[\d.]+/g).map(Number);
    const blend = (fg, bg) => { // fg may have alpha
      const a = fg.length > 3 ? fg[3] : 1;
      return [0,1,2].map(i => Math.round(fg[i] * a + bg[i] * (1 - a)));
    };
    const lum = c => { const s = c.map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }); return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2]; };
    const ratio = (a,b) => { const l1 = Math.max(lum(a),lum(b)), l2 = Math.min(lum(a),lum(b)); return (l1+0.05)/(l2+0.05); };
    const bgOf = el => {
      let n = el;
      while (n && n.nodeType === 1) {
        const cs = getComputedStyle(n);
        const bc = cs.backgroundColor;
        const m = parse(bc);
        if (m.length && (m.length < 4 || m[3] > 0.85)) return m.slice(0,3);
        n = n.parentElement;
      }
      return [255,255,255];
    };
    const results = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    let node;
    while ((node = walker.nextNode())) {
      const txt = node.textContent.trim();
      if (!txt) continue;
      const el = node.parentElement;
      if (!el || seen.has(el)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('.drawer') || el.closest('[aria-hidden="true"]')) continue;
      if (el.closest('picture') || el.closest('.cta-bg') || el.closest('.site-header') || el.closest('.hero') || el.closest('.quote-card')) continue;
      seen.add(el);
      const fg = blend(parse(cs.color), bgOf(el));
      const bg = bgOf(el);
      const size = parseFloat(cs.fontSize);
      const weight = +cs.fontWeight;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      results.push({ txt: txt.slice(0, 32), size: +size.toFixed(1), fg: cs.color, bg: 'rgb(' + bg.join(',') + ')', ratio: +ratio(fg, bg).toFixed(2), large, tag: el.tagName + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '') });
    }
    return results;
  });
  const fails = out.filter(r => r.ratio < (r.large ? 3 : 4.5));
  const uniq = [...new Map(fails.map(f => [f.tag + f.fg + f.size, f])).values()];
  console.log(`checked ${out.length} text elements`);
  if (!uniq.length) console.log('All rendered text meets WCAG AA.');
  uniq.forEach(f => console.log(`LOW ${f.ratio}:1 (${f.size}px) ${f.tag} — "${f.txt}" ${f.fg} on ${f.bg}`));
  const worst = out.sort((a,b) => a.ratio - b.ratio).slice(0, 5);
  console.log('\nlowest ratios:', worst.map(w => w.ratio + ' ' + w.tag).join(' | '));
  await b.close();
  process.exit(uniq.length ? 1 : 0);
})();
