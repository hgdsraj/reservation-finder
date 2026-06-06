// TheFork (owned by Tripadvisor) — dominant in Europe, Australia, Latin America
// Uses their internal search API (no auth required for venue discovery)
const { createClient } = require('../utils/httpClient');
const { cache, cacheKey } = require('../utils/cache');

const client = createClient('https://www.thefork.com', {
  Referer: 'https://www.thefork.com/',
  Origin: 'https://www.thefork.com',
});

async function searchRestaurants({ city, cityData, date, partySize }) {
  const key = cacheKey('thefork', city, date, partySize);
  if (cache.has(key)) return cache.get(key);

  const params = {
    location: cityData?.city || city,
    date,
    partySize,
    lat: cityData?.lat,
    lon: cityData?.lng,
    page: 1,
    perPage: 20,
    sort: 'overall_rating',
  };

  const res = await client.get('/api/restaurants', { params });
  const items = res.data?.data || res.data?.restaurants || res.data?.items || [];

  const normalized = items.map((r) => normalizeRestaurant(r, date, partySize)).filter(Boolean);
  cache.set(key, normalized);
  return normalized;
}

function normalizeRestaurant(r, date, partySize) {
  if (!r?.name) return null;

  const photos = [];
  if (r.mainPhoto?.source) photos.push(r.mainPhoto.source);
  else if (r.photo) photos.push(r.photo);
  else if (r.pictures?.length) photos.push(r.pictures[0]);

  const slots = (r.availabilities || r.availability || []).map((s) => ({
    time: s.slot || s.time || '',
    url: r.url || r.restaurantUrl || buildTheForkUrl(r, date, partySize),
  })).filter((s) => s.time);

  return {
    id: `thefork-${r.uuid || r.id || Math.random().toString(36).slice(2)}`,
    name: r.name,
    platform: 'thefork',
    cuisine: r.servedCuisines?.map((c) => c.label).join(', ') || r.cuisineType || 'Restaurant',
    neighborhood: r.neighborhoodName || r.district || '',
    address: r.address?.street || r.address || '',
    price: mapPrice(r.priceRange),
    rating: r.avgRating ? parseFloat(r.avgRating).toFixed(1) : null,
    reviewCount: r.reviewCount || r.ratingsCount || 0,
    photos,
    description: r.description || r.tagline || '',
    bookingUrl: r.url || buildTheForkUrl(r, date, partySize),
    slots,
  };
}

function mapPrice(priceRange) {
  const map = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$', cheap: '$', mid: '$$', high: '$$$', luxury: '$$$$' };
  return map[priceRange] || '$$';
}

function buildTheForkUrl(r, date, partySize) {
  const slug = r.slug || r.urlName;
  if (slug) return `https://www.thefork.com/restaurant/${slug}?date=${date}&partySize=${partySize}`;
  return 'https://www.thefork.com';
}

module.exports = { searchRestaurants, normalizeRestaurant, mapPrice };
