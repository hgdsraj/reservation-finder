#!/usr/bin/env node
/**
 * Focused API test with timeouts — runs each check independently
 */

const https = require('https');
const http = require('http');

const LAT = 49.2827;
const LNG = -123.1207;
const DATE = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const PARTY = 2;
const RESY_KEY = 'VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5';
const TIMEOUT_MS = 8000;

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'application/json',
      ...opts.headers,
    };
    const req = mod.request(url, { method: opts.method || 'GET', headers, timeout: TIMEOUT_MS }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ ok: res.statusCode < 300, status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

const LOG = [];
function log(...args) { const s = args.join(' '); LOG.push(s); console.log(s); }

// ─── Resy: dump full structure ────────────────────────────────────────────────
async function testResy() {
  log('\n══ RESY /4/find ══');
  const r = await fetch(
    `https://api.resy.com/4/find?lat=${LAT}&long=${LNG}&day=${DATE}&party_size=${PARTY}&per_page=3&page=1`,
    { headers: { Authorization: `ResyAPI api_key="${RESY_KEY}"`, 'X-Origin': 'https://resy.com', Referer: 'https://resy.com/', Origin: 'https://resy.com' } }
  );
  log(`Status: ${r.status}`);
  const d = JSON.parse(r.body);
  const venues = d?.results?.venues || [];
  log(`Venues: ${venues.length}`);
  if (venues[0]) {
    const entry = venues[0];
    log(`\nFull first entry keys: ${Object.keys(entry).join(', ')}`);
    log(`venue keys: ${Object.keys(entry.venue || {}).join(', ')}`);
    const v = entry.venue || {};
    log(`\nurl_slug: ${v.url_slug}`);
    log(`urlSlug: ${v.urlSlug}`);
    log(`images: ${JSON.stringify(v.images)}`);
    log(`photos: ${JSON.stringify(v.photos)}`);
    log(`location keys: ${Object.keys(v.location || {}).join(', ')}`);
    log(`lat_long: ${JSON.stringify(v.location?.lat_long)}`);
    log(`rating: ${JSON.stringify(v.rating)}`);
    log(`price_range_id: ${v.price_range_id}`);
    log(`\nFull venue JSON (first 2000 chars):\n${JSON.stringify(v, null, 2).slice(0, 2000)}`);
  }
}

// ─── Resy /3/venue/find ───────────────────────────────────────────────────────
async function testResyVenueDetail(venueId) {
  log('\n══ RESY /3/venue/find ══');
  const r = await fetch(
    `https://api.resy.com/3/venue/find?id=${venueId}`,
    { headers: { Authorization: `ResyAPI api_key="${RESY_KEY}"`, 'X-Origin': 'https://resy.com', Referer: 'https://resy.com/', Origin: 'https://resy.com' } }
  );
  log(`Status: ${r.status}`);
  if (r.ok) {
    const d = JSON.parse(r.body);
    log(`Top-level keys: ${Object.keys(d).join(', ')}`);
    const v = d.venue || d;
    log(`images: ${JSON.stringify((v.images || []).slice(0, 2))}`);
    log(`photos: ${JSON.stringify((v.photos || []).slice(0, 2))}`);
  } else {
    log(`Body: ${r.body.slice(0, 300)}`);
  }
}

// ─── OpenTable (widget) ───────────────────────────────────────────────────────
async function testOpenTableWidget() {
  log('\n══ OPENTABLE widget/reservation/restaurant-search ══');
  const r = await fetch(
    `https://www.opentable.com/widget/reservation/restaurant-search?lang=en-US&page=1&pageSize=5&query=Vancouver`,
    { headers: { Referer: 'https://www.opentable.com/' } }
  );
  log(`Status: ${r.status}`);
  log(`CORS: ${r.headers['access-control-allow-origin'] || '(none)'}`);
  if (r.ok) {
    const d = JSON.parse(r.body);
    const list = d.RestaurantList || d.restaurantList || [];
    log(`Restaurants: ${list.length}`);
    if (list[0]) {
      const rest = list[0];
      log(`First: "${rest.Name}" Id=${rest.Id}`);
      log(`Photos: ${JSON.stringify(rest.Photos?.slice(0, 2))}`);
      log(`Lat/Lng: ${rest.Latitude}, ${rest.Longitude}`);
    }
  } else {
    log(`Body (first 400): ${r.body.slice(0, 400)}`);
  }
}

// ─── OpenTable (dapi REST) ────────────────────────────────────────────────────
async function testOpenTableDapi() {
  log('\n══ OPENTABLE /dapi/res/v2/restaurant-search ══');
  const r = await fetch(
    `https://www.opentable.com/dapi/res/v2/restaurant-search?latitude=${LAT}&longitude=${LNG}&radius=2&limit=5&covers=${PARTY}&dateTime=${DATE}T19:00`,
    { headers: { Referer: 'https://www.opentable.com/', 'X-CSRF-Token': 'not-needed-for-GET' } }
  );
  log(`Status: ${r.status}`);
  log(`CORS: ${r.headers['access-control-allow-origin'] || '(none)'}`);
  log(`Body (first 500): ${r.body.slice(0, 500)}`);
}

// ─── OpenTable availability ───────────────────────────────────────────────────
async function testOpenTableAvail(rid) {
  log(`\n══ OPENTABLE availability rid=${rid} ══`);
  const r = await fetch(
    `https://www.opentable.com/widget/reservation/restaurant-availability?rid=${rid}&party_size=${PARTY}&datetime=${DATE}T19:00:00&startTime=19:00&endTime=22:00&lang=en-US&isPreferredTime=false`,
    { headers: { Referer: 'https://www.opentable.com/' } }
  );
  log(`Status: ${r.status}`);
  if (r.ok) {
    const d = JSON.parse(r.body);
    const slots = d.availability || [];
    log(`Slots: ${slots.length}`);
    if (slots[0]) log(`First slot: ${slots[0].dateTime}`);
  } else {
    log(`Body: ${r.body.slice(0, 300)}`);
  }
}

// ─── Tock ─────────────────────────────────────────────────────────────────────
async function testTock() {
  log('\n══ TOCK consumer API ══');
  const r = await fetch(
    `https://www.exploretock.com/api/consumer/v2/search/experiences?q=Vancouver&date=${DATE}&size=${PARTY}&page=0&type=restaurant&per_page=5`,
    { headers: { Referer: 'https://www.exploretock.com/' } }
  );
  log(`Status: ${r.status}`);
  log(`CORS: ${r.headers['access-control-allow-origin'] || '(none)'}`);
  if (r.ok) {
    const d = JSON.parse(r.body);
    const list = d?.results || d?.experiences || [];
    log(`Results: ${list.length}`);
    if (list[0]) {
      log(`First: "${list[0].business?.name}"  slug=${list[0].business?.slug}`);
      log(`Photo: ${list[0].business?.backgroundImage?.url}`);
      log(`Slots/avail: ${JSON.stringify(list[0].slots || list[0].availabilities)}`);
    }
  } else {
    log(`Body: ${r.body.slice(0, 300)}`);
  }
}

// ─── SevenRooms ───────────────────────────────────────────────────────────────
async function testSevenRooms() {
  log('\n══ SEVENROOMS ══');
  // Their venue search endpoint used by the concierge widget
  const url = `https://www.sevenrooms.com/api-yoa/search_venues?lat=${LAT}&long=${LNG}&radius=5&query=&limit=5`;
  const r = await fetch(url, { headers: { Referer: 'https://www.sevenrooms.com/', 'X-Api-Key': '' } });
  log(`Status: ${r.status}`);
  log(`Body (first 500): ${r.body.slice(0, 500)}`);
}

async function testSevenRoomsConcierge() {
  log('\n══ SEVENROOMS concierge/search ══');
  const url = `https://www.sevenrooms.com/api-yoa/concierge/search?lat=${LAT}&long=${LNG}&radius=5&limit=5&date=${DATE}&party_size=${PARTY}`;
  const r = await fetch(url, { headers: { Referer: 'https://www.sevenrooms.com/' } });
  log(`Status: ${r.status}`);
  log(`Body (first 500): ${r.body.slice(0, 500)}`);
}

// ─── TheFork ──────────────────────────────────────────────────────────────────
async function testTheFork() {
  log('\n══ THEFORK ══');
  // Their internal search - mostly European
  const url = `https://www.thefork.com/api/restaurant/search?lat=${LAT}&lng=${LNG}&limit=5`;
  const r = await fetch(url, { headers: { Referer: 'https://www.thefork.com/' } });
  log(`Status: ${r.status}`);
  log(`Body (first 300): ${r.body.slice(0, 300)}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run(label, fn) {
  try { await fn(); }
  catch (e) { log(`  ❌ ${label}: ${e.message}`); }
}

async function main() {
  log(`\n=== API Verification / ${DATE} / Vancouver ===`);
  await run('resy', testResy);

  // get venue ID from first resy result
  let venueId;
  try {
    const r = await fetch(`https://api.resy.com/4/find?lat=${LAT}&long=${LNG}&day=${DATE}&party_size=${PARTY}&per_page=1&page=1`,
      { headers: { Authorization: `ResyAPI api_key="${RESY_KEY}"`, 'X-Origin': 'https://resy.com', Referer: 'https://resy.com/', Origin: 'https://resy.com' } });
    const d = JSON.parse(r.body);
    venueId = d?.results?.venues?.[0]?.venue?.id?.resy;
    log(`\nGot venue id: ${venueId}`);
  } catch {}

  if (venueId) await run('resy-venue-detail', () => testResyVenueDetail(venueId));

  await run('opentable-widget', testOpenTableWidget);
  await run('opentable-dapi', testOpenTableDapi);
  await run('opentable-avail', () => testOpenTableAvail(1016));
  await run('tock', testTock);
  await run('sevenrooms', testSevenRooms);
  await run('sevenrooms-concierge', testSevenRoomsConcierge);
  await run('thefork', testTheFork);

  log('\n=== DONE ===');
}

main().catch(console.error);
