const { createClient } = require('../utils/httpClient');
const { cache, cacheKey } = require('../utils/cache');

const RESY_API_KEY = process.env.RESY_API_KEY || 'VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5';

const client = createClient('https://api.resy.com', {
  Authorization: `ResyAPI api_key="${RESY_API_KEY}"`,
  'X-Origin': 'https://resy.com',
  Referer: 'https://resy.com/',
  Origin: 'https://resy.com',
});

const PRICE_MAP = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

async function searchRestaurants({ city, cityData, date, partySize }) {
  if (!cityData?.lat) return [];

  const key = cacheKey('resy', city, date, partySize);
  if (cache.has(key)) return cache.get(key);

  const res = await client.get('/4/find', {
    params: { lat: cityData.lat, long: cityData.lng, day: date, party_size: partySize, per_page: 30, page: 1 },
  });

  const venues = res.data?.results?.venues || [];
  const normalized = venues.map((v) => normalizeVenue(v, date, partySize));
  cache.set(key, normalized);
  return normalized;
}

function normalizeVenue(v, date, partySize) {
  const venue = v.venue || v;
  const slots = (v.slots || []).map((s) => {
    const raw = s.date?.start;
    const time = raw
      ? new Date(raw).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '';
    return {
      time,
      url: venue?.urlSlug
        ? `https://resy.com/cities/ny/${venue.urlSlug}?date=${date}&seats=${partySize}`
        : 'https://resy.com',
    };
  }).filter((s) => s.time);

  const photos = (venue?.images || []).filter(Boolean);

  return {
    id: `resy-${venue?.id?.resy || venue?.urlSlug || Math.random().toString(36).slice(2)}`,
    name: venue?.name || 'Unknown',
    platform: 'resy',
    cuisine: (venue?.cuisine || []).join(', ') || venue?.type || 'Restaurant',
    neighborhood: venue?.location?.neighborhood || venue?.location?.locality || '',
    address: venue?.location?.address_1 || '',
    price: PRICE_MAP[venue?.price_range_id] || '$$',
    rating: venue?.rating?.average != null ? parseFloat(venue.rating.average).toFixed(1) : null,
    reviewCount: venue?.rating?.count || 0,
    photos,
    description: venue?.content?.[0]?.body?.[0]?.text || '',
    bookingUrl: venue?.urlSlug ? `https://resy.com/cities/ny/${venue.urlSlug}` : 'https://resy.com',
    slots,
  };
}

module.exports = { searchRestaurants, normalizeVenue };
