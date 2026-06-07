const puppeteer = require('puppeteer-extra');
const Stealth = require('puppeteer-extra-plugin-stealth');
puppeteer.use(Stealth());
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args:['--no-sandbox','--disable-blink-features=AutomationControlled'] });
  const p = await b.newPage(); await p.setUserAgent(UA);
  const ops = {};
  p.on('request', req => {
    const u = req.url();
    if (u.includes('/dapi/fe/gql')) {
      const m = u.match(/opname=([^&]+)/);
      const pd = req.postData();
      let hash=null; try { hash = JSON.parse(pd||'{}')?.extensions?.persistedQuery?.sha256Hash; } catch {}
      if (m) ops[m[1]] = { hash, hasQuery: !!(pd&&pd.includes('"query"')) };
    }
  });
  await p.goto('https://www.opentable.com/', { waitUntil:'networkidle2', timeout:35000 });
  await sleep(4000);
  // also try navigating to a metro landing page to trigger more ops (search-like)
  console.log('HOMEPAGE OPS:', JSON.stringify(ops, null, 1));
  // try metro page to see if it fires availability ops
  try {
    await p.goto('https://www.opentable.com/vancouver-restaurants', { waitUntil:'networkidle2', timeout:35000 });
    await sleep(4000);
  } catch(e){ console.log('metro nav', e.message.slice(0,40)); }
  console.log('AFTER METRO OPS:', JSON.stringify(Object.keys(ops)));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
