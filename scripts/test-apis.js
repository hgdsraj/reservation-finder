#!/usr/bin/env node
/**
 * API verification script — runs from Node to test each platform
 * Usage: node scripts/test-apis.js
 */

const https = require('https');
const http = require('http');

const CITY = 'Vancouver';
const LAT = 49.2827;
const LNG = -123.1207;
const DATE = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // tomorrow
const PARTY = 2;
const RESY_KEY = 'VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5';

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      ...opts.headers,
    };
    const req = mod.request(url, { method: opts.method || 'GET', headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function ok(label, detail) { console.log(`  ✅ ${label}  ${detail || ''}`); }
function fail(label, detail) { console.log(`  ❌ ${label}  ${detail || ''}`); }
function info(label, detail) { console.log(`  ℹ️  ${label}  ${detail || ''}`); }

async function testResy() {
  console.log('\n── Resy (/4/find) ──────────────────────────');
  try {
    const url = `https://api.resy.com/4/find?lat=${LAT}&long=${LNG}&day=${DATE}&party_size=${PARTY}&per_page=5&page=1`;
    const r = await fetch(url, {
      headers: {
        Authorization: `ResyAPI api_key="${RESY_KEY}"`,
        'X-Origin': 'https://resy.com',
        Referer: 'https://resy.com/',
        Origin: 'https://resy.com',
      },
    });
    if (r.status !== 200) { fail(`HTTP ${r.status}`); return; }
    const d = JSON.parse(r.body);
    const venues = d?.results?.venues || [];
    ok(`${venues.length} venues returned`);

    if (venues[0]) {
      const v = venues[0].venue || venues[0];
      const loc = v?.location || {};
      info(`First venue: "${v?.name}"`);
      info(`  url_slug=${v?.url_slug}  urlSlug=${v?.urlSlug}`);
      info(`  images=${JSON.stringify(v?.images?.slice(0,2))}`);
      info(`  photos=${JSON.stringify(v?.photos?.slice(0,2))}`);
      info(`  lat_long=${JSON.stringify(loc?.lat_long)}`);
      info(`  slots count=${venues[0].slots?.length}`);
      if (venues[0].slots?.[0]) {
        info(`  first slot date=${venues[0].slots[0]?.date?.start}`);
        info(`  first slot config=${JSON.stringify(venues[0].slots[0]?.config)}`);
      }
    }
  } catch (e) { fail('Request failed', e.message); }
}

async function testOpenTable() {
  console.log('\n── OpenTable widget search ──────────────────');
  try {
    const url = `https://www.opentable.com/widget/reservation/restaurant-search?lang=en-US&page=1&pageSize=5&query=${encodeURIComponent(CITY)}`;
    const r = await fetch(url, { headers: { Referer: 'https://www.opentable.com/' } });
    info(`HTTP ${r.status}`);
    info(`CORS header: ${r.headers['access-control-allow-origin'] || '(none)'}`);
    if (r.status === 200) {
      const d = JSON.parse(r.body);
      const list = d.RestaurantList || d.restaurantList || [];
      ok(`${list.length} restaurants`);
      if (list[0]) {
        info(`First: "${list[0].Name || list[0].name}"`);
        info(`  Photos=${JSON.stringify(list[0].Photos?.slice(0,1))}`);
        info(`  Latitude=${list[0].Latitude}  Longitude=${list[0].Longitude}`);
      }
    } else {
      fail(`HTTP ${r.status}`, r.body.slice(0, 200));
    }
  } catch (e) { fail('Request failed', e.message); }
}

async function testOpenTableAvailability(rid = 1234) {
  console.log('\n── OpenTable availability ───────────────────');
  // Try a known Vancouver restaurant (The Keg Gastown ~rid 1016)
  try {
    const url = `https://www.opentable.com/widget/reservation/restaurant-availability?rid=${rid}&party_size=${PARTY}&datetime=${DATE}T19:00:00&startTime=19:00&endTime=22:00&lang=en-US&isPreferredTime=false`;
    const r = await fetch(url, { headers: { Referer: 'https://www.opentable.com/' } });
    info(`HTTP ${r.status}`);
    if (r.status === 200) {
      const d = JSON.parse(r.body);
      const slots = d.availability || [];
      ok(`${slots.length} slots for rid=${rid}`);
      if (slots[0]) info(`First slot: ${slots[0].dateTime}`);
    } else {
      fail(`HTTP ${r.status}`, r.body.slice(0, 200));
    }
  } catch (e) { fail('Request failed', e.message); }
}

async function testOpenTableGQL() {
  console.log('\n── OpenTable dapi/fe/gql (internal GraphQL) ─');
  try {
    const body = JSON.stringify({
      operationName: 'GetSearchPageResults',
      variables: {
        input: {
          latitude: LAT,
          longitude: LNG,
          covers: PARTY,
          dateTime: `${DATE}T19:00`,
          radius: 2,
          term: '',
        },
      },
      query: `query GetSearchPageResults($input: RestaurantSearchInput!) {
        restaurantSearch(input: $input) {
          restaurants { id name urlSlug neighborhood address latitude longitude photos { url } availabilities { timeSlot } }
        }
      }`,
    });
    const r = await fetch('https://www.opentable.com/dapi/fe/gql?operation=GetSearchPageResults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://www.opentable.com/' },
      body,
    });
    info(`HTTP ${r.status}`);
    if (r.status === 200) {
      const d = JSON.parse(r.body);
      const list = d?.data?.restaurantSearch?.restaurants || [];
      ok(`${list.length} restaurants from GQL`);
      if (list[0]) info(`First: ${JSON.stringify(list[0]).slice(0, 200)}`);
    } else {
      fail(`HTTP ${r.status}`, r.body.slice(0, 300));
    }
  } catch (e) { fail('Request failed', e.message); }
}

async function testTock() {
  console.log('\n── Tock consumer API ────────────────────────');
  try {
    const url = `https://www.exploretock.com/api/consumer/v2/search/experiences?q=${encodeURIComponent(CITY)}&date=${DATE}&size=${PARTY}&page=0&type=restaurant&per_page=5`;
    const r = await fetch(url, { headers: { Referer: 'https://www.exploretock.com/' } });
    info(`HTTP ${r.status}`);
    info(`CORS: ${r.headers['access-control-allow-origin'] || '(none)'}`);
    if (r.status === 200) {
      const d = JSON.parse(r.body);
      const list = d?.results || d?.experiences || [];
      ok(`${list.length} experiences`);
      if (list[0]) {
        info(`First: "${list[0].business?.name}"`);
        info(`  slug=${list[0].business?.slug}`);
        info(`  photo=${list[0].business?.backgroundImage?.url?.slice(0, 60)}`);
      }
    } else {
      fail(`HTTP ${r.status}`, r.body.slice(0, 200));
    }
  } catch (e) { fail('Request failed', e.message); }
}

async function testSevenRooms() {
  console.log('\n── SevenRooms search ────────────────────────');
  try {
    const url = `https://www.sevenrooms.com/api-yoa/search_venues?query=${encodeURIComponent(CITY)}&lat=${LAT}&long=${LNG}&limit=5`;
    const r = await fetch(url, { headers: { Referer: 'https://www.sevenrooms.com/' } });
    info(`HTTP ${r.status}`);
    if (r.status === 200) {
      const d = JSON.parse(r.body);
      const list = d?.data?.venues || d?.results || d?.venues || [];
      if (list.length) {
        ok(`${list.length} venues`);
        info(`First: ${JSON.stringify(list[0]).slice(0, 200)}`);
      } else {
        info('0 venues — response shape:', JSON.stringify(d).slice(0, 300));
      }
    } else {
      fail(`HTTP ${r.status}`, r.body.slice(0, 300));
    }
  } catch (e) { fail('Request failed', e.message); }
}

async function testSevenRoomsV2() {
  console.log('\n── SevenRooms widget search (v2) ────────────');
  // Their widget/concierge API
  try {
    const url = `https://www.sevenrooms.com/api-yoa/search?lat=${LAT}&long=${LNG}&query=${encodeURIComponent(CITY)}&limit=5`;
    const r = await fetch(url, { headers: { Referer: 'https://www.sevenrooms.com/' } });
    info(`HTTP ${r.status}`, r.body.slice(0, 300));
  } catch (e) { fail('Request failed', e.message); }
}

async function testTheFork() {
  console.log('\n── TheFork (TripAdvisor) ────────────────────');
  try {
    // TheFork is strong in Europe. Try their API
    const url = `https://www.thefork.com/api/restaurants?city=${encodeURIComponent(CITY)}&limit=5`;
    const r = await fetch(url, { headers: { Referer: 'https://www.thefork.com/' } });
    info(`HTTP ${r.status}`, r.body.slice(0, 200));
  } catch (e) { fail('Request failed', e.message); }
}

async function testOpenTableSearch2() {
  console.log('\n── OpenTable /s page (lat/lng) ──────────────');
  try {
    const url = `https://www.opentable.com/s?covers=${PARTY}&dateTime=${DATE}T19%3A00%3A00&latitude=${LAT}&longitude=${LNG}&radius=2`;
    const r = await fetch(url);
    info(`HTTP ${r.status}`);
    // Look for __NEXT_DATA__ JSON
    const match = r.body.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
    if (match) {
      const nextData = JSON.parse(match[1]);
      const props = nextData?.props?.pageProps;
      info('__NEXT_DATA__ keys: ' + Object.keys(props || {}).join(', '));
      const restaurants = props?.restaurants || props?.searchResults || props?.results || [];
      if (restaurants.length) {
        ok(`${restaurants.length} restaurants in __NEXT_DATA__`);
        info(`First: ${JSON.stringify(restaurants[0]).slice(0, 200)}`);
      } else {
        info('restaurants array not found in props — check structure');
        info(JSON.stringify(props).slice(0, 400));
      }
    } else {
      info('No __NEXT_DATA__ script found');
    }
  } catch (e) { fail('Request failed', e.message); }
}

async function testResyAvailability() {
  console.log('\n── Resy /4/venue/find (single venue details) ─');
  // Try to get venue details for a known resy restaurant
  try {
    const url = `https://api.resy.com/4/find?lat=${LAT}&long=${LNG}&day=${DATE}&party_size=${PARTY}&per_page=1&page=1`;
    const r = await fetch(url, {
      headers: {
        Authorization: `ResyAPI api_key="${RESY_KEY}"`,
        'X-Origin': 'https://resy.com',
        Referer: 'https://resy.com/',
        Origin: 'https://resy.com',
      },
    });
    const d = JSON.parse(r.body);
    const v = d?.results?.venues?.[0]?.venue;
    if (!v) { info('no venue returned'); return; }

    const venueId = v?.id?.resy;
    info(`venue id: ${venueId}, trying /3/venue/find`);

    if (venueId) {
      const r2 = await fetch(`https://api.resy.com/3/venue/find?id=${venueId}`, {
        headers: {
          Authorization: `ResyAPI api_key="${RESY_KEY}"`,
          'X-Origin': 'https://resy.com',
          Referer: 'https://resy.com/',
          Origin: 'https://resy.com',
        },
      });
      const d2 = JSON.parse(r2.body);
      info(`/3/venue/find status=${r2.status}`);
      info(`images: ${JSON.stringify(d2?.venue?.images?.slice(0,2) || d2?.images?.slice(0,2))}`);
      info(`photos: ${JSON.stringify(d2?.venue?.photos?.slice(0,2) || d2?.photos?.slice(0,2))}`);
    }
  } catch(e) { fail('Request failed', e.message); }
}

async function main() {
  console.log(`\n=== API Verification — ${CITY} / ${DATE} / party ${PARTY} ===`);
  await testResy();
  await testOpenTable();
  await testOpenTableAvailability(1016);  // The Keg Gastown
  await testOpenTableGQL();
  await testOpenTableSearch2();
  await testTock();
  await testSevenRooms();
  await testSevenRoomsV2();
  await testTheFork();
  await testResyAvailability();
  console.log('\n=== Done ===\n');
}

main().catch(console.error);
