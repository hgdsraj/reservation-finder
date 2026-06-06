// Shared stealth headless-browser pool. Platforms like OpenTable/Tock sit behind
// Akamai/DataDome bot-walls that block plain HTTP from datacenter IPs. A real
// (stealth-patched) browser navigating the site's own origin generates the
// sensor cookies those walls require, and same-origin fetches dodge CORS.
//
// NOTE: bot-walls also key off IP reputation. From a residential IP this works;
// from a datacenter IP (Railway) the walls will likely still 403. Set PROXY_URL
// to a residential/ISP proxy to make this reliable in production.
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Candidate Chrome/Chromium locations, in priority order.
const EXECUTABLE_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function resolveExecutablePath() {
  const fs = require('fs');
  for (const p of EXECUTABLE_CANDIDATES) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  // Let puppeteer-core throw a clear error if nothing is found.
  return process.env.PUPPETEER_EXECUTABLE_PATH || EXECUTABLE_CANDIDATES[0];
}

let browserPromise = null;

async function getBrowser() {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    if (b && b.connected) return b;
    browserPromise = null;
  }

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--window-size=1280,900',
  ];
  if (process.env.PROXY_URL) {
    // e.g. http://user:pass@host:port — pass host:port here, creds via page auth
    const u = new URL(process.env.PROXY_URL);
    args.push(`--proxy-server=${u.protocol}//${u.host}`);
  }

  browserPromise = puppeteer.launch({
    headless: true,
    executablePath: resolveExecutablePath(),
    args,
  });

  return browserPromise;
}

// Run `fn(page)` on a fresh page that has navigated to `originUrl`, so any
// in-page fetch() runs same-origin with the site's real cookies. Always closes
// the page. Returns whatever `fn` returns; on any failure returns `fallback`.
async function withPage(originUrl, fn, { timeout = 30000, settle = 3500, fallback = [] } = {}) {
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1280, height: 900 });
    if (process.env.PROXY_URL) {
      const u = new URL(process.env.PROXY_URL);
      if (u.username) await page.authenticate({ username: decodeURIComponent(u.username), password: decodeURIComponent(u.password) });
    }
    await page.goto(originUrl, { waitUntil: 'domcontentloaded', timeout });
    if (settle) await new Promise((r) => setTimeout(r, settle));
    return await fn(page);
  } catch (err) {
    if (process.env.DEBUG_SCRAPERS) console.error(`[browser] ${originUrl} failed:`, err.message);
    return fallback;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

async function closeBrowser() {
  if (!browserPromise) return;
  const b = await browserPromise.catch(() => null);
  if (b) await b.close().catch(() => {});
  browserPromise = null;
}

module.exports = { getBrowser, withPage, closeBrowser, UA };
