// OpenTable scraper — server-side via stealth browser.
//
// OpenTable's public HTTP endpoints are Akamai-walled (plain requests time out /
// 403). But its own GraphQL gateway (/dapi/fe/gql) works once we're on the
// opentable.com origin with a CSRF token + sensor cookies that a real browser
// session produces. Flow:
//   1. Autocomplete            -> resolve the city to a metroId
//   2. HomeModuleLists         -> restaurant list (coords, price, cuisine, token)
//   3. RestaurantsAvailability -> live time slots (best-effort; more heavily
//      protected, so we still return restaurants + correct deeplinks if it 403s)
const { getBrowser } = require('../utils/browser');
const { cache, cacheKey } = require('../utils/cache');

// Persisted-query hashes (stable across deploys; refresh if OpenTable rotates them).
const HASHES = {
  Autocomplete: 'fe1d118abd4c227750693027c2414d43014c2493f64f49bcef5a65274ce9c3c3',
  HomeModuleLists: '0e5866ce03cf2311495610b1376204f29a05be114dbddb0dbfc70dd20eea7fab',
  RestaurantsAvailability: 'cbcf4838a9b399f742e3741785df64560a826d8d3cc2828aa01ab09a8455e29e',
};

const PRICE_MAP = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

async function searchRestaurants({ city, cityData, date, partySize, time }) {
  const key = cacheKey('opentable', city, date, partySize);
  if (cache.has(key)) return cache.get(key);

  const lat = cityData?.lat;
  const lng = cityData?.lng;
  const cityName = cityData?.city || city;
  if (lat == null || lng == null) return [];

  const browser = await getBrowser();
  const page = await browser.newPage();
  let csrf = null;
  page.on('request', (req) => {
    const h = req.headers();
    if (h['x-csrf-token'] && !csrf) csrf = h['x-csrf-token'];
  });

  try {
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('https://www.opentable.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    const gql = (opname, variables) =>
      page.evaluate(
        async (opname, variables, hash, csrf) => {
          const res = await fetch(`/dapi/fe/gql?optype=query&opname=${opname}`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-csrf-token': csrf,
              'ot-page-group': 'seo-landing-home',
              'ot-page-type': 'home',
              'x-query-timeout': '6000',
            },
            body: JSON.stringify({
              operationName: opname,
              variables,
              extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
            }),
          });
          try { return await res.json(); } catch { return null; }
        },
        opname, variables, HASHES[opname], csrf
      );

    // 1) Resolve metroId
    const ac = await gql('Autocomplete', { term: cityName, latitude: lat, longitude: lng, useNewVersion: true });
    const acResults = ac?.data?.autocomplete?.autocompleteResults || [];
    const metroId = (acResults.find((r) => r.metroId) || {}).metroId || 0;

    // 2) Restaurant list
    const requestDateTime = `${date}T${time || '19:00'}:00`;
    const hml = await gql('HomeModuleLists', {
      excludeStateId: [], excludeLists: [], mods: [], includeDemoland: false,
      includePrivateDiningRooms: false, useCBR: true,
      requestedDate: date, requestedTime: time || '19:00', partySize,
      requestDateTime, locQ: `${lat},${lng}`, locU: `${lat},${lng}`,
      requestContext: { pageType: 'home', platform: 'desktop' },
      tld: 'com', maxLists: 6, itemsPerList: 20, itemsPerListByModule: [],
      metroId, latitude: lat, longitude: lng,
    });

    const collected = [];
    const walk = (o, depth = 0) => {
      if (!o || typeof o !== 'object' || depth > 7) return;
      for (const [k, v] of Object.entries(o)) {
        if (k === 'restaurants' && Array.isArray(v)) {
          v.forEach((r) => { if (r?.restaurantId && r.name) collected.push(r); });
        } else if (v && typeof v === 'object') walk(v, depth + 1);
      }
    };
    walk(hml?.data);
    const uniq = [...new Map(collected.map((r) => [r.restaurantId, r])).values()];
    if (!uniq.length) { cache.set(key, []); return []; }

    // 3) Best-effort live availability
    const slotsByRid = {};
    try {
      const ids = uniq.slice(0, 20).map((r) => r.restaurantId);
      const tokens = uniq.slice(0, 20).map((r) => r.restaurantAvailabilityToken);
      const av = await gql('RestaurantsAvailability', {
        onlyPop: false, forwardDays: 0, requireTimes: false, requireTypes: [], useCBR: false,
        privilegedAccess: [], restaurantIds: ids, restaurantAvailabilityTokens: tokens,
        databaseRegion: 'NA', attributionToken: null, partySize, dateTime: requestDateTime,
      });
      const avail = av?.data?.availability || av?.data?.restaurantsAvailability || [];
      (Array.isArray(avail) ? avail : []).forEach((a) => {
        const rid = a.restaurantId || a.id;
        const times = (a.timeslots || a.timeSlots || a.slots || [])
          .map((s) => s.dateTime || s.time || s.timeOffset)
          .filter(Boolean);
        if (rid && times.length) slotsByRid[rid] = times;
      });
    } catch {
      /* availability blocked — fall back to deeplinks only */
    }

    const normalized = uniq
      .map((r) => normalizeRestaurant(r, date, partySize, time, slotsByRid[r.restaurantId]))
      .filter(Boolean);
    cache.set(key, normalized);
    return normalized;
  } finally {
    await page.close().catch(() => {});
  }
}

function normalizeRestaurant(r, date, partySize, time, rawSlots) {
  const profile = r.urls?.profileLink?.link || '';
  const dt = `${date}T${time || '19:00'}`;
  const bookingUrl = profile
    ? `${profile}?datetime=${encodeURIComponent(dt)}&covers=${partySize}`
    : 'https://www.opentable.com';

  const slots = (rawSlots || []).map((s) => {
    const t = typeof s === 'string' && s.includes('T') ? s.split('T')[1].slice(0, 5) : String(s).slice(0, 5);
    return {
      time: t,
      url: profile
        ? `${profile}?datetime=${encodeURIComponent(`${date}T${t}`)}&covers=${partySize}`
        : bookingUrl,
    };
  }).filter((s) => s.time);

  const photo = r.photo?.url || r.heroPhoto?.url || r.photos?.[0]?.url;
  const ratingVal = r.statistics?.ratings?.overall?.rating ?? r.statistics?.overallRating;

  return {
    id: `opentable-${r.restaurantId}`,
    name: r.name,
    platform: 'opentable',
    cuisine: r.primaryCuisine?.name || 'Restaurant',
    neighborhood: r.neighborhood?.name || r.neighborhoodName || '',
    address: r.address?.line1 || '',
    price: PRICE_MAP[r.priceBand?.priceBandId] || '$$',
    rating: typeof ratingVal === 'number' ? ratingVal.toFixed(1) : null,
    reviewCount: r.statistics?.reviews?.allTimeTextReviewCount || r.reviewCount || 0,
    photos: photo ? [photo] : [],
    description: r.description || '',
    bookingUrl,
    slots,
    lat: r.coordinates?.latitude ?? null,
    lng: r.coordinates?.longitude ?? null,
  };
}

module.exports = { searchRestaurants, normalizeRestaurant };
