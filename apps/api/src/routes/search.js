const express = require('express');
const router = express.Router();
const { resolveCity } = require('../utils/cityCoords');
const opentable = require('../scrapers/opentable');
const resy = require('../scrapers/resy');
const tock = require('../scrapers/tock');
const { enrichWithYelp } = require('../enrichers/yelp');

// All three run server-side. Resy uses a plain JSON API; OpenTable and Tock sit
// behind Akamai/protobuf walls and are driven through a stealth headless browser
// (see utils/browser.js). SevenRooms (no city search — embedded widgets only) and
// TheFork (DataDome captcha + Europe-only) are not city-searchable, so omitted.
const SERVER_PLATFORMS = [
  { name: 'resy',      fn: (a) => resy.searchRestaurants(a) },
  { name: 'opentable', fn: (a) => opentable.searchRestaurants(a) },
  { name: 'tock',      fn: (a) => tock.searchRestaurants(a) },
];

function sseWrite(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function parseSearchQuery(query) {
  const { city, date, partySize = '2', time = '19:00', lat, lng } = query;
  return {
    city,
    date,
    partySize: Math.max(1, Math.min(20, parseInt(partySize) || 2)),
    time,
    lat: lat ? parseFloat(lat) : null,
    lng: lng ? parseFloat(lng) : null,
  };
}

// SSE streaming — browser connects here, results arrive platform by platform
router.get('/stream', async (req, res) => {
  const { city, date, partySize, time, lat, lng } = parseSearchQuery(req.query);

  if (!city || !date) {
    return res.status(400).json({ error: 'city and date are required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let cityData;
  // Accept pre-geocoded coords from frontend (avoids double Nominatim call)
  if (lat && lng) {
    cityData = { lat, lng, label: city, city: city.split(',')[0].trim(), country: 'US' };
    sseWrite(res, 'status', { message: `Scanning ${city}...`, phase: 'search', cityData });
  } else {
    try {
      sseWrite(res, 'status', { message: 'Resolving location...', phase: 'geocode' });
      cityData = await resolveCity(city);
      if (!cityData) {
        sseWrite(res, 'error', { message: `Could not resolve "${city}" — try a different city name.` });
        return res.end();
      }
      sseWrite(res, 'status', { message: `Scanning ${cityData.label}...`, phase: 'search', cityData });
    } catch {
      cityData = { lat: null, lng: null, label: city, city };
      sseWrite(res, 'status', { message: `Searching ${city}...`, phase: 'search', cityData });
    }
  }

  const args = { city, cityData, date, partySize, time };
  let allRestaurants = [];

  await Promise.allSettled(
    SERVER_PLATFORMS.map(async ({ name, fn }) => {
      sseWrite(res, 'status', { message: `Scanning ${name}...`, phase: name });
      try {
        const results = await fn(args);
        allRestaurants.push(...results);
        sseWrite(res, 'restaurants', { platform: name, restaurants: results });
      } catch (err) {
        sseWrite(res, 'platform_error', { platform: name, message: err.message });
      }
    })
  );

  if (process.env.YELP_API_KEY && allRestaurants.length) {
    try {
      allRestaurants = await enrichWithYelp(allRestaurants, cityData);
      sseWrite(res, 'enriched', { restaurants: allRestaurants });
    } catch (_) {}
  }

  sseWrite(res, 'done', { total: allRestaurants.length });
  res.end();
});

// REST fallback (no streaming)
router.get('/', async (req, res) => {
  const { city, date, partySize, time, lat, lng } = parseSearchQuery(req.query);
  if (!city || !date) return res.status(400).json({ error: 'city and date are required' });

  try {
    let cityData = null;
    if (lat && lng) {
      cityData = { lat, lng, label: city, city: city.split(',')[0].trim() };
    } else {
      cityData = await resolveCity(city).catch(() => null);
    }

    const args = { city, cityData, date, partySize, time };
    const settled = await Promise.allSettled(SERVER_PLATFORMS.map(({ fn }) => fn(args)));
    const restaurants = settled.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);
    res.json({ restaurants, total: restaurants.length, cityData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
