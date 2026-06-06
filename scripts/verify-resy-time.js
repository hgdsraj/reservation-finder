const puppeteer = require('puppeteer-extra');
const Stealth = require('puppeteer-extra-plugin-stealth');
puppeteer.use(Stealth());
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = 'https://resy.com/cities/vanc/venues/the-american';
const urls = [
  `${base}?date=2026-06-07&seats=2&time=1215`,
  `${base}?date=2026-06-07&seats=2&time=12:15`,
];
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox','--disable-blink-features=AutomationControlled'] });
  for (const u of urls) {
    const page = await browser.newPage(); await page.setUserAgent(UA);
    try { await page.goto(u, { waitUntil: 'networkidle2', timeout: 30000 }); await sleep(2500);
      const r = await page.evaluate(() => ({ finalUrl: location.href, notFound: /page not found/i.test(document.title), title: document.title.slice(0,50) }));
      console.log(u.slice(40), '->', JSON.stringify(r));
    } catch(e){ console.log(u.slice(40), 'ERR', e.message); }
    await page.close();
  }
  await browser.close();
})();
