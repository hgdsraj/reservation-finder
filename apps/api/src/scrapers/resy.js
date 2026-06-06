const { createClient } = require('../utils/httpClient');
const { cache, cacheKey } = require('../utils/cache');

// Public web client key embedded in Resy's JS bundle
const RESY_API_KEY = process.env.RESY_API_KEY || 'VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5';

const client = createClient('https://api.resy.com', {
  Authorization: `ResyAPI api_key="${RESY_API_KEY}"`,
  'X-Origin': 'https://resy.com',
  Referer: 'https://resy.com/',
  Origin: 'https://resy.com',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
});

const PRICE_MAP = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

// Resy uses market/city codes in their venue URLs
const CITY_CODES = {
  'new york': 'ny', 'new york city': 'ny', 'nyc': 'ny',
  'brooklyn': 'ny', 'queens': 'ny', 'manhattan': 'ny',
  'chicago': 'ch',
  'los angeles': 'la', 'la': 'la', 'west hollywood': 'la', 'santa monica': 'la',
  'san francisco': 'sf', 'sf': 'sf', 'oakland': 'sf',
  'miami': 'miami', 'miami beach': 'miami', 'brickell': 'miami',
  'washington': 'dc', 'washington dc': 'dc', 'dc': 'dc',
  'boston': 'bos',
  'las vegas': 'lv',
  'seattle': 'sea',
  'denver': 'den',
  'austin': 'aus',
  'nashville': 'nas',
  'houston': 'hou',
  'atlanta': 'atl',
  'portland': 'pdx',
  'philadelphia': 'phi',
  'dallas': 'dal',
  'new orleans': 'no',
  'minneapolis': 'min',
  'london': 'london',
  'toronto': 'toronto',
  'vancouver': 'vancouver',
  'montreal': 'montreal',
};

function getCityCode(cityName = '') {
  const key = cityName.toLowerCase().trim();
  if (CITY_CODES[key]) return CITY_CODES[key];
  for (const [name, code] of Object.entries(CITY_CODES)) {
    if (key.includes(name) || name.includes(key)) return code;
  }
  return null;
}

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
  const cityCode = getCityCode(cityData.city || city);
  const normalized = venues.map((v) => normalizeVenue(v, date, partySize, cityCode));
  cache.set(key, normalized);
  return normalized;
}

function normalizeVenue(v, date, partySize, cityCode) {
  const venue = v.venue || v;
  const loc = venue?.location || {};
  const derivedCityCode = cityCode || getCityCode(loc.city || loc.locality || '');
  const slug = venue?.urlSlug;

  const slots = (v.slots || []).map((s) => {
    const raw = s.date?.start;
    const timeStr = raw
      ? new Date(raw).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '';
    return {
      time: timeStr,
      url: derivedCityCode && slug
        ? `https://resy.com/cities/${derivedCityCode}/${slug}?date=${date}&seats=${partySize}`
        : slug
        ? `https://resy.com/${slug}`
        : 'https://resy.com',
    };
  }).filter((s) => s.time);

  const photos = (venue?.images || []).filter(Boolean);

  const bookingUrl = derivedCityCode && slug
    ? `https://resy.com/cities/${derivedCityCode}/${slug}`
    : slug
    ? `https://resy.com/${slug}`
    : 'https://resy.com';

  return {
    id: `resy-${venue?.id?.resy || slug || Math.random().toString(36).slice(2)}`,
    name: venue?.name || 'Unknown',
    platform: 'resy',
    cuisine: (venue?.cuisine || []).join(', ') || venue?.type || 'Restaurant',
    neighborhood: loc.neighborhood || loc.locality || '',
    address: loc.address_1 || '',
    price: PRICE_MAP[venue?.price_range_id] || '$$',
    rating: venue?.rating?.average != null ? parseFloat(venue.rating.average).toFixed(1) : null,
    reviewCount: venue?.rating?.count || 0,
    photos,
    description: venue?.content?.[0]?.body?.[0]?.text || '',
    bookingUrl,
    slots,
    lat: loc.lat_long?.latitude || null,
    lng: loc.lat_long?.longitude || null,
  };
}

module.exports = { searchRestaurants, normalizeVenue, getCityCode };
