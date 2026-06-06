const express = require('express');
const router = express.Router();
const { resolveCity } = require('../utils/cityCoords');
const opentable = require('../scrapers/opentable');
const resy = require('../scrapers/resy');
const tock = require('../scrapers/tock');
const sevenrooms = require('../scrapers/sevenrooms');
const thefork = require('../scrapers/thefork');
const { enrichWithYelp } = require('../enrichers/yelp');

const PLATFORMS = [
  { name: 'opentable',   fn: (a) => opentable.searchRestaurants(a) },
  { name: 'resy',        fn: (a) => resy.searchRestaurants(a) },
  { name: 'tock',        fn: (a) => tock.searchRestaurants(a) },
  { name: 'sevenrooms',  fn: (a) => sevenrooms.searchRestaurants(a) },
  { name: 'thefork',     fn: (a) => thefork.searchRestaurants(a) },
];

function sseWrite(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function parseSearchQuery(query) {
  const { city, date, partySize = '2', time = '19:00' } = query;
  return { city, date, partySize: Math.max(1, Math.min(20, parseInt(partySize) || 2)), time };
}

// SSE streaming — results arrive progressively per platform
router.get('/stream', async (req, res) => {
  const { city, date, partySize, time } = parseSearchQuery(req.query);

  if (!city || !date) {
    return res.status(400).json({ error: 'city and date are required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let cityData = null;
  try {
    sseWrite(res, 'status', { message: 'Resolving location...', phase: 'geocode' });
    cityData = await resolveCity(city);
    if (!cityData) {
      sseWrite(res, 'error', { message: `Could not resolve location: "${city}"` });
      return res.end();
    }
    sseWrite(res, 'status', { message: `Scanning restaurants in ${cityData.label}...`, phase: 'search', cityData });
  } catch (err) {
    sseWrite(res, 'status', { message: 'Geocoding failed, searching by name...', phase: 'search' });
    cityData = { lat: null, lng: null, label: city, city };
  }

  const args = { city, cityData, date, partySize, time };
  let allRestaurants = [];

  await Promise.allSettled(
    PLATFORMS.map(async ({ name, fn }) => {
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
    sseWrite(res, 'status', { message: 'Enriching with Yelp ratings & photos...', phase: 'yelp' });
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
  const { city, date, partySize, time } = parseSearchQuery(req.query);
  if (!city || !date) return res.status(400).json({ error: 'city and date are required' });

  try {
    const cityData = await resolveCity(city).catch(() => null);
    const args = { city, cityData, date, partySize, time };

    const settled = await Promise.allSettled(PLATFORMS.map(({ fn }) => fn(args)));
    const restaurants = settled
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    res.json({ restaurants, total: restaurants.length, cityData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
