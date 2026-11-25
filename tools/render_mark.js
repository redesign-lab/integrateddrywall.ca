const puppeteer = require('/tmp/qa/node_modules/puppeteer-core');
const fs = require('fs');
const d = fs.readFileSync('/tmp/logo-d.txt', 'utf8').trim();
const variants = [
  { file: '/tmp/mark-white.png', color: '#ffffff' },
  { file: '/tmp/mark-dark.png',  color: '#0e0f0f' },
];
(async () => {
  const b = await puppeteer.launch({ executablePath: '/tmp/chromium', headless: 'shell',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote'] });
  const p = await b.newPage();
  for (const v of variants) {
    await p.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
    await p.setContent(`<html><body style="margin:0;background:transparent">
      <svg width="512" height="512" viewBox="146 126 424 424" xmlns="http://www.w3.org/2000/svg">
        <path fill="${v.color}" fill-rule="evenodd" d="${d}"/>
      </svg></body></html>`);
    await p.screenshot({ path: v.file, omitBackground: true });
    console.log('rendered', v.file);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
