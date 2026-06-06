const puppeteer = require('puppeteer-extra');
const Stealth = require('puppeteer-extra-plugin-stealth');
puppeteer.use(Stealth());
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const urls = [
  'https://resy.com/book/details?token=rgs%3A%2F%2Fresy%2F83785%2F3552084%2F2%2F2026-06-07%2F2026-06-07%2F12%3A00%3A00%2F2%2FHigh%20Stool%20Seating&date=2026-06-07&seats=2',
  'https://resy.com/cities/vanc/the-american?date=2026-06-07&seats=2',
  'https://resy.com/cities/vanc/venues/the-american?date=2026-06-07&seats=2',
];
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox','--disable-blink-features=AutomationControlled'] });
  for (const u of urls) {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    try {
      await page.goto(u, { waitUntil: 'networkidle2', timeout: 35000 });
      await sleep(2500);
      const info = await page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        return {
          title: document.title,
          finalUrl: location.href,
          notFound: /page not found|404|can't find|cannot find|doesn’t exist|does not exist/i.test(bodyText),
          hasReserve: /reserve|book now|select a time|party size|seats/i.test(bodyText),
          h1: (document.querySelector('h1')?.innerText || '').slice(0, 80),
          snippet: bodyText.replace(/\s+/g,' ').slice(0, 160),
        };
      });
      console.log('\nURL:', u.slice(0, 80));
      console.log('  ', JSON.stringify(info));
    } catch (e) { console.log('\nURL:', u.slice(0,80), '-> ERR', e.message); }
    await page.close();
  }
  await browser.close();
})();
