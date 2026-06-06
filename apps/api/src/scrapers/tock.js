const { createClient } = require('../utils/httpClient');
const { cache, cacheKey } = require('../utils/cache');

const client = createClient('https://www.exploretock.com', {
  Referer: 'https://www.exploretock.com/',
});

async function searchRestaurants({ city, cityData, date, partySize }) {
  const key = cacheKey('tock', city, date, partySize);
  if (cache.has(key)) return cache.get(key);

  const res = await client.get('/api/consumer/v2/search/experiences', {
    params: { q: cityData?.city || city, date, size: partySize, page: 0, type: 'restaurant', per_page: 24 },
  });

  const items = res.data?.results || res.data?.experiences || [];
  const normalized = items.map(normalizeExperience).filter(Boolean);
  cache.set(key, normalized);
  return normalized;
}

function normalizeExperience(e) {
  const biz = e.business;
  if (!biz?.name) return null;

  const slots = (e.slots || e.availabilities || []).map((s) => ({
    time: s.time || s.startTime || '',
    url: `https://www.exploretock.com/${biz.slug || ''}`,
  })).filter((s) => s.time);

  const photos = [];
  if (biz.backgroundImage?.url) photos.push(biz.backgroundImage.url);
  if (e.heroImages?.length) photos.push(...e.heroImages.map((i) => i.url).filter(Boolean));

  return {
    id: `tock-${e.id || biz.id || Math.random().toString(36).slice(2)}`,
    name: biz.name,
    platform: 'tock',
    cuisine: (e.tags || []).map((t) => t.name).join(', ') || biz.cuisine || 'Restaurant',
    neighborhood: biz.neighborhood || '',
    address: biz.address || '',
    price: derivePriceRange(e.price || e.minimumPrice),
    rating: null,
    reviewCount: 0,
    photos,
    description: e.description || biz.description || '',
    bookingUrl: biz.slug ? `https://www.exploretock.com/${biz.slug}` : 'https://www.exploretock.com',
    slots,
  };
}

function derivePriceRange(price) {
  if (price == null) return '$$';
  if (price < 30) return '$';
  if (price < 75) return '$$';
  if (price < 150) return '$$$';
  return '$$$$';
}

module.exports = { searchRestaurants, normalizeExperience, derivePriceRange };
