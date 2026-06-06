// Tock scraper — server-side via stealth browser, DOM scrape.
//
// Tock's data comes from a protobuf endpoint (/api/consumer/page) that isn't
// practical to replay, and its search results only render client-side. So we
// drive the real search results page and read the rendered venue cards.
// Card text looks like: "Kissa Tanto1.7 km · Central Vancouver · $$$ · Japanese"
const { withPage } = require('../utils/browser');
const { cache, cacheKey } = require('../utils/cache');

async function searchRestaurants({ city, cityData, date, partySize, time }) {
  const key = cacheKey('tock', city, date, partySize);
  if (cache.has(key)) return cache.get(key);

  const cityName = cityData?.city || city;
  const latlng = cityData?.lat != null ? `&latlng=${cityData.lat},${cityData.lng}` : '';
  const url =
    `https://www.exploretock.com/search?query=${encodeURIComponent(cityName)}` +
    `&date=${date}&size=${partySize}&time=${encodeURIComponent(time || '19:00')}${latlng}`;

  const cards = await withPage(
    url,
    async (page) => {
      // Lazy-loaded results — scroll to surface them all.
      for (let i = 0; i < 6; i++) {
        await page.evaluate(() => window.scrollBy(0, 2500));
        await new Promise((r) => setTimeout(r, 800));
      }
      return page.evaluate(() => {
        const isVenue = (h) =>
          /^\/[a-z0-9][a-z0-9-]{2,}(\?|$)/.test(h) &&
          !/^\/(city|search|discover|login|signup|help|gift|business|press|careers|terms|privacy|blog|app|about|contact|faq|covid|wineries|events|brand|consumer)/.test(h);
        const anchors = [...document.querySelectorAll('a[href]')].filter((a) => isVenue(a.getAttribute('href') || ''));
        const byHref = new Map();
        for (const a of anchors) {
          const href = a.getAttribute('href').split('?')[0];
          if (byHref.has(href)) continue;
          let card = a;
          for (let i = 0; i < 4 && card.parentElement && !card.querySelector('img'); i++) card = card.parentElement;
          const img = card.querySelector('img');
          byHref.set(href, {
            href,
            txt: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160),
            img: img ? img.src || img.getAttribute('data-src') : null,
          });
        }
        return [...byHref.values()];
      });
    },
    { settle: 4500, timeout: 35000, fallback: [] }
  );

  const normalized = cards.map((c) => normalizeCard(c, date, partySize, time)).filter(Boolean);
  cache.set(key, normalized);
  return normalized;
}

function normalizeCard(card, date, partySize, time) {
  if (!card?.href) return null;
  const txt = card.txt || '';
  // Name = text up to the first "X km" distance, price ($), or " · " separator.
  const cut = txt.search(/\d+(?:\.\d+)?\s*km|·|\$/);
  const name = (cut > 0 ? txt.slice(0, cut) : txt).trim();
  if (!name) return null;

  const segments = txt.split('·').map((s) => s.trim()).filter(Boolean);
  const price = (txt.match(/\$+/) || ['$$'])[0];
  // Last segment is usually the cuisine; a middle non-price segment is the area.
  const meta = segments.slice(1).filter((s) => !/\$/.test(s) && !/km/.test(s));
  const neighborhood = meta.length > 1 ? meta[0] : '';
  const cuisine = meta.length ? meta[meta.length - 1] : 'Restaurant';

  const path = card.href;
  const bookingUrl =
    `https://www.exploretock.com${path}?date=${date}&size=${partySize}&time=${encodeURIComponent(time || '19:00')}`;

  return {
    id: `tock-${path.replace(/\//g, '')}`,
    name,
    platform: 'tock',
    cuisine: cuisine || 'Restaurant',
    neighborhood,
    address: '',
    price: /^\$+$/.test(price) ? price : '$$',
    rating: null,
    reviewCount: 0,
    photos: card.img && /^https?:/.test(card.img) ? [card.img] : [],
    description: '',
    bookingUrl,
    slots: [],
    lat: null,
    lng: null,
  };
}

module.exports = { searchRestaurants, normalizeCard };
