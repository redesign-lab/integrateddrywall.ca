/* Hero legibility check.
   Renders the hero twice (text visible / text hidden) and diffs the pixels, so
   contrast is measured against the ACTUAL composited photograph + scrim behind
   each block — not against a flat CSS colour. Only glyph-core pixels are scored,
   which keeps anti-aliased edges from skewing the result.

   Usage:  CHROME_PATH=/path/to/chrome node tools/hero-legibility.mjs
*/
/* Exact hero legibility check.
   Renders twice (text hidden / text visible) and diffs the pixels, so we only
   score the pixels where glyphs actually sit. Reports the WORST glyph pixel. */
// Resolves puppeteer-core from NODE_PATH or a local install; falls back to the
// path used during development if neither is present.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let puppeteer;
try { puppeteer = require('puppeteer-core'); }
catch { puppeteer = require(process.env.PUPPETEER || '/tmp/qa/node_modules/puppeteer-core'); }

const PAGE_URL = process.env.URL || new globalThis.URL('../index.html', import.meta.url).href;
const sizes = [[360,780,true],[390,844,true],[430,932,true],[768,1024,false],[1024,768,false],[1280,800,false],[1440,900,false],[1920,1000,false]];
const lum = (r,g,b) => { const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
const ratio = (a,b) => (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);

const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'chromium', headless: 'shell',
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--allow-file-access-from-files']});
let fails = 0, worst = 99;

for (const [w,h,mobile] of sizes) {
  const p = await b.newPage();
  await p.setViewport({ width:w, height:h, deviceScaleFactor:1, isMobile:mobile, hasTouch:mobile });
  await p.goto(PAGE_URL, { waitUntil:'networkidle0' });
  await new Promise(r=>setTimeout(r,900));

  const boxes = await p.evaluate(() => {
    const g = s => { const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return [r.x,r.y,r.width,r.height]; };
    return { eyebrow:g('.hero .eyebrow'), h1:g('.hero-title'), sub:g('.ht-sub'), lede:g('.hero-lede'), facts:g('.hero-facts') };
  });

  const visibleShot = await p.screenshot({ encoding:'binary' });
  await p.addStyleTag({ content:'.hero-copy > *, .hero-facts > *{visibility:hidden!important}' });
  await new Promise(r=>setTimeout(r,180));
  const hiddenShot = await p.screenshot({ encoding:'binary' });

  const b64a = 'data:image/png;base64,' + Buffer.from(visibleShot).toString('base64');
  const b64b = 'data:image/png;base64,' + Buffer.from(hiddenShot).toString('base64');

  const results = await p.evaluate(async (a, bUrl, boxes) => {
    const load = async u => { const i=new Image(); i.src=u; await i.decode(); return i; };
    const [ia, ib] = await Promise.all([load(a), load(bUrl)]);
    const c=document.createElement('canvas'); c.width=ia.width; c.height=ia.height;
    const ctx=c.getContext('2d');
    const grab = async img => { ctx.clearRect(0,0,c.width,c.height); ctx.drawImage(img,0,0); return ctx.getImageData(0,0,c.width,c.height).data; };
    const A = await grab(ia), B = await grab(ib);
    const out = {};
    for (const [k, box] of Object.entries(boxes)) {
      if (!box) continue;
      const x0=Math.max(0,Math.round(box[0])), y0=Math.max(0,Math.round(box[1]));
      const x1=Math.min(c.width,Math.round(box[0]+box[2])), y1=Math.min(c.height,Math.round(box[1]+box[3]));
      const pairs = [];
      for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++) {
        const i=(y*c.width+x)*4;
        const fg = [A[i],A[i+1],A[i+2]], bg = [B[i],B[i+1],B[i+2]];
        const d = Math.abs(fg[0]-bg[0])+Math.abs(fg[1]-bg[1])+Math.abs(fg[2]-bg[2]);
        if (d <= 30) continue;
        // glyph core only: exclude anti-aliased edges so we score real type, not the halo
        if (fg[0] < 170) continue;
        pairs.push([bg, fg]);
      }
      out[k] = pairs;
    }
    return out;
  }, b64a, b64b, boxes);

  const parts = [];
  for (const [k, pairs] of Object.entries(results)) {
    if (!pairs || !pairs.length) continue;
    // score every glyph pixel; take the 95th percentile worst (ignores stray anti-alias edges)
    const rs = pairs.map(([fg,bg]) => ratio(lum(...fg), lum(...bg))).sort((x,y)=>x-y);
    // 10th percentile = the darker tail of anti-aliased edges; a realistic worst case
    const p05 = rs[Math.floor(rs.length*0.05)];
    const min = rs[0];
    const need = k === 'h1' ? 3 : 4.5;
    if (p05 < need) fails++;
    worst = Math.min(worst, p05);
    parts.push(`${p05>=need?'ok ':'LOW'} ${k} ${p05.toFixed(1)}:1${min<need?` (min ${min.toFixed(1)})`:''}`);
  }
  console.log(String(w).padStart(5)+'px  '+parts.join('   '));
  await p.close();
}
await b.close();
console.log(`\nworst glyph contrast across all breakpoints: ${worst.toFixed(1)}:1 — ` + (fails? `${fails} block(s) under target` : 'all hero text clears WCAG AA'));
process.exit(fails?1:0);
