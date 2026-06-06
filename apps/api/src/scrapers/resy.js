const { createClient } = require('../utils/httpClient');
const { cache, cacheKey } = require('../utils/cache');

const RESY_API_KEY = process.env.RESY_API_KEY || 'VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5';

const client = createClient('https://api.resy.com', {
  Authorization: `ResyAPI api_key="${RESY_API_KEY}"`,
  'X-Origin': 'https://resy.com',
  Referer: 'https://resy.com/',
  Origin: 'https://resy.com',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
});

// Price map: Resy uses price_range (1-4)
const PRICE_MAP = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

async function searchRestaurants({ city, cityData, date, partySize }) {
  if (!cityData?.lat) return [];

  const key = cacheKey('resy', city, date, partySize);
  if (cache.has(key)) return cache.get(key);

  const res = await client.get('/4/find', {
    params: {
      lat: cityData.lat,
      long: cityData.lng,
      day: date,
      party_size: partySize,
      per_page: 30,
      page: 1,
    },
  });

  const venues = res.data?.results?.venues || [];
  const normalized = venues.map((v) => normalizeVenue(v, date, partySize));
  cache.set(key, normalized);
  return normalized;
}

function extractPhotos(venue) {
  // Photos live at venue.responsive_images.urls[imageHash]["4:3"]["800"]
  const urls = venue?.responsive_images?.urls || {};
  const photos = Object.values(urls)
    .map((img) => img?.['4:3']?.['800'] || img?.['16:9']?.['800'] || img?.['1:1']?.['400'])
    .filter(Boolean);
  if (photos.length) return photos;

  // Fallback: originals
  const originals = venue?.responsive_images?.originals || {};
  return Object.values(originals).map((o) => o?.url).filter(Boolean);
}

function normalizeVenue(v, date, partySize) {
  const venue = v.venue || v;
  const loc = venue?.location || {};

  // The API returns url_slug (snake_case), NOT urlSlug
  const slug = venue?.url_slug;
  // location.code is the short city code Resy uses in URLs (e.g. "vanc", "nyc", "sf")
  // location.url_slug ("vancouver-bc") does NOT match Resy's website URL format
  const cityCode = loc?.code;

  const bookingBase = cityCode && slug
    ? `https://resy.com/cities/${cityCode}/${slug}`
    : slug
    ? `https://resy.com/${slug}`
    : 'https://resy.com';

  const slots = (v.slots || []).map((s) => {
    // date.start is "YYYY-MM-DD HH:MM:SS" — extract time portion
    const raw = s.date?.start || '';
    const time = raw.includes(' ') ? raw.split(' ')[1]?.slice(0, 5) : '';
    // Resy has no stable per-slot deeplink — `resy.com/book/details?token=…`
    // redirects to resy.com/404. Link to the venue page with the date + party
    // preset; it opens showing that day's available times to book.
    const url = `${bookingBase}?date=${date}&seats=${partySize}`;
    return { time, url };
  }).filter((s) => s.time);

  // Rating is a direct float, not nested
  const rating = typeof venue?.rating === 'number'
    ? parseFloat(venue.rating).toFixed(1)
    : null;

  return {
    id: `resy-${venue?.id?.resy || slug || Math.random().toString(36).slice(2)}`,
    name: venue?.name || 'Unknown',
    platform: 'resy',
    cuisine: venue?.type || 'Restaurant',
    neighborhood: loc?.neighborhood || '',
    address: '',
    price: PRICE_MAP[venue?.price_range] || '$$',
    rating,
    reviewCount: venue?.total_ratings || 0,
    photos: extractPhotos(venue),
    description: (venue?.content || []).find((c) => c.body?.length > 0)?.body?.[0]?.text || '',
    bookingUrl: bookingBase,
    slots,
    // Coordinates are at location.geo.lat/lon (NOT lat_long.latitude)
    lat: loc?.geo?.lat || null,
    lng: loc?.geo?.lon || null,
  };
}

module.exports = { searchRestaurants, normalizeVenue };
