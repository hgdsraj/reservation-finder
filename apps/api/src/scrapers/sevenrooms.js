// SevenRooms — high-end / hotel restaurant network (now owned by DoorDash)
// Uses their consumer venue search endpoint (no partner key required for venue discovery)
const { createClient } = require('../utils/httpClient');
const { cache, cacheKey } = require('../utils/cache');

const client = createClient('https://www.sevenrooms.com', {
  Referer: 'https://www.sevenrooms.com/',
  Origin: 'https://www.sevenrooms.com',
});

async function searchRestaurants({ city, cityData, date, partySize }) {
  if (!cityData?.lat) return [];

  const key = cacheKey('sevenrooms', city, date, partySize);
  if (cache.has(key)) return cache.get(key);

  const params = {
    city: cityData.city || city,
    venue_type: 'restaurant',
    limit: 20,
    offset: 0,
  };

  const res = await client.get('/api-yoa/search_venues', { params });
  const venues = res.data?.venues || res.data?.results || [];

  const normalized = venues.map((v) => normalizeVenue(v, date, partySize)).filter(Boolean);
  cache.set(key, normalized);
  return normalized;
}

function normalizeVenue(v, date, partySize) {
  if (!v?.name) return null;

  const photos = [];
  if (v.background_image_url) photos.push(v.background_image_url);
  if (v.logo_url) photos.push(v.logo_url);

  const slots = (v.availability || []).map((s) => ({
    time: s.time_slot || s.time || '',
    url: v.url_name
      ? `https://www.sevenrooms.com/reservations/${v.url_name}?party_size=${partySize}&date=${date}`
      : 'https://www.sevenrooms.com',
  })).filter((s) => s.time);

  return {
    id: `sevenrooms-${v.id || v.url_name || Math.random().toString(36).slice(2)}`,
    name: v.name,
    platform: 'sevenrooms',
    cuisine: v.venue_category_display || v.cuisine_type_display || 'Restaurant',
    neighborhood: v.neighborhood || v.cross_street_display || '',
    address: v.address || '',
    price: derivePriceRange(v.price_range),
    rating: v.overall_rating ? parseFloat(v.overall_rating).toFixed(1) : null,
    reviewCount: v.review_count || 0,
    photos,
    description: v.description || v.tagline || '',
    bookingUrl: v.url_name
      ? `https://www.sevenrooms.com/reservations/${v.url_name}`
      : 'https://www.sevenrooms.com',
    slots,
  };
}

function derivePriceRange(range) {
  if (!range) return '$$';
  if (range === 'low') return '$';
  if (range === 'medium') return '$$';
  if (range === 'high') return '$$$';
  if (range === 'very_high') return '$$$$';
  const n = parseInt(range);
  if (isNaN(n)) return '$$';
  if (n <= 1) return '$';
  if (n <= 2) return '$$';
  if (n <= 3) return '$$$';
  return '$$$$';
}

module.exports = { searchRestaurants, normalizeVenue, derivePriceRange };
