const puppeteer = require('puppeteer-extra');
const Stealth = require('puppeteer-extra-plugin-stealth');
puppeteer.use(Stealth());
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args:['--no-sandbox','--disable-blink-features=AutomationControlled','--window-size=1300,1000'] });
  const p = await b.newPage(); await p.setUserAgent(UA); await p.setViewport({width:1300,height:1000});
  // 1) warm up cookies on homepage
  await p.goto('https://www.opentable.com/', { waitUntil:'domcontentloaded', timeout:30000 });
  await sleep(3000);
  // 2) navigate to search results
  const url = 'https://www.opentable.com/s?covers=2&dateTime=2026-06-12T19%3A00&latitude=49.2827&longitude=-123.1207&term=Vancouver';
  await p.goto(url, { waitUntil:'networkidle2', timeout:40000 }).catch(e=>console.log('nav',e.message));
  await sleep(4000);
  const info = await p.evaluate(() => {
    const blocked = /Access Denied|don.t have permission/i.test(document.body.innerText);
    // restaurant cards: links to /r/
    const cards = [...document.querySelectorAll('[data-test="restaurant-card"], [data-testid="restaurant-card"]')];
    // generic: anchors to /r/
    const rlinks = [...document.querySelectorAll('a[href*="/r/"]')].map(a=>a.getAttribute('href'));
    // time slot buttons (often have data-test or aria with time)
    const slotBtns = [...document.querySelectorAll('[data-test*="time" i], [class*="slot" i], a[href*="/booking/"], button[aria-label*=":"]')].slice(0,10).map(e=>({t:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,20), test:e.getAttribute('data-test')}));
    return { blocked, title: document.title, url: location.href, cardCount: cards.length, rlinkCount: new Set(rlinks).size, sampleRlinks:[...new Set(rlinks)].slice(0,5), slotBtns, bodyStart: document.body.innerText.replace(/\s+/g,' ').slice(0,200) };
  });
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
