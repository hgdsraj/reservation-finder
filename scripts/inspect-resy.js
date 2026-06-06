#!/usr/bin/env node
// Dump the full Resy /4/find response to understand exact field names

const https = require('https');

const LAT = 49.2827, LNG = -123.1207;
const DATE = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const KEY = 'VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5';

function get(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers, timeout: 10000 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    }).on('error', reject).on('timeout', () => reject(new Error('TIMEOUT')));
  });
}

async function main() {
  const r = await get(
    `https://api.resy.com/4/find?lat=${LAT}&long=${LNG}&day=${DATE}&party_size=2&per_page=5&page=1`,
    { Authorization: `ResyAPI api_key="${KEY}"`, 'X-Origin': 'https://resy.com', Referer: 'https://resy.com/', Origin: 'https://resy.com', 'User-Agent': 'Mozilla/5.0' }
  );
  console.log('Status:', r.status);
  if (r.status !== 200) { console.log(r.body.slice(0, 500)); return; }

  const data = JSON.parse(r.body);
  const venues = data?.results?.venues || [];
  console.log(`Venues: ${venues.length}`);

  if (venues[0]) {
    const entry = venues[0];
    console.log('\n=== Top-level keys of first venue entry ===');
    console.log(Object.keys(entry).join(', '));

    console.log('\n=== venue keys ===');
    const v = entry.venue;
    console.log(Object.keys(v || {}).join(', '));

    console.log('\n=== location keys ===');
    console.log(Object.keys(v?.location || {}).join(', '));

    console.log('\n=== Slug fields ===');
    console.log('url_slug:', v?.url_slug);
    console.log('urlSlug:', v?.urlSlug);

    console.log('\n=== Image/Photo fields ===');
    console.log('images:', JSON.stringify(v?.images));
    console.log('photos:', JSON.stringify(v?.photos));
    // Check if images are nested
    for (const key of Object.keys(v || {})) {
      const val = v[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const nested = JSON.stringify(val);
        if (nested.includes('http') && (nested.includes('jpg') || nested.includes('png') || nested.includes('webp') || nested.includes('resy.com') || nested.includes('cloudfront'))) {
          console.log(`  Possible image field "${key}":`, nested.slice(0, 200));
        }
      }
      if (Array.isArray(val) && val.length && typeof val[0] === 'string' && val[0].startsWith('http')) {
        console.log(`  Image array "${key}":`, val.slice(0, 2));
      }
    }

    console.log('\n=== Location ===');
    console.log(JSON.stringify(v?.location, null, 2));

    console.log('\n=== Rating ===');
    console.log(JSON.stringify(v?.rating));

    console.log('\n=== Slots (first entry) ===');
    const slot = entry.slots?.[0];
    console.log(JSON.stringify(slot, null, 2));

    // Print curated booking info
    console.log('\n=== Full venue JSON ===');
    console.log(JSON.stringify(v, null, 2).slice(0, 3000));
  }
}

main().catch(console.error);
