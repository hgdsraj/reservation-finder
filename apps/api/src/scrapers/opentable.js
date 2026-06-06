const pLimit = require('p-limit');
const { createClient } = require('../utils/httpClient');
const { cache, cacheKey } = require('../utils/cache');

const client = createClient('https://www.opentable.com', {
  Referer: 'https://www.opentable.com/',
});

const PRICE_MAP = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

async function searchRestaurants({ city, cityData, date, partySize, time }) {
  const key = cacheKey('opentable', city, date, partySize);
  if (cache.has(key)) return cache.get(key);

  const params = { lang: 'en-US', page: 1, pageSize: 40, query: city };
  if (cityData?.otMetroId) params.metroId = cityData.otMetroId;

  const searchRes = await client.get('/widget/reservation/restaurant-search', { params });
  const restaurants = searchRes.data?.RestaurantList || searchRes.data?.restaurantList || [];

  const normalized = restaurants.map(normalizeRestaurant);
  const limit = pLimit(5);
  const withSlots = await Promise.all(
    normalized.slice(0, 20).map((r) =>
      limit(() => fetchAvailability(r, date, partySize, time).catch(() => ({ ...r, slots: [] })))
    )
  );
  const remaining = normalized.slice(20).map((r) => ({ ...r, slots: [] }));
  const result = [...withSlots, ...remaining];

  cache.set(key, result);
  return result;
}

async function fetchAvailability(restaurant, date, partySize, time) {
  const datetime = `${date}T${time || '19:00'}:00`;
  const params = {
    rid: restaurant.id,
    party_size: partySize,
    datetime,
    startTime: time || '18:00',
    endTime: addHours(time || '18:00', 3),
    isPreferredTime: false,
    lang: 'en-US',
  };

  const res = await client.get('/widget/reservation/restaurant-availability', {
    params,
    timeout: 8000,
  });

  const slots = (res.data?.availability || []).map((s) => ({
    time: s.dateTime ? s.dateTime.split('T')[1]?.slice(0, 5) : s.time,
    url: `https://www.opentable.com/booking/experiences-availability?rid=${restaurant.id}&datetime=${s.dateTime}&covers=${partySize}`,
  }));

  return { ...restaurant, slots };
}

function normalizeRestaurant(r) {
  const photos = [];
  if (r.Photos?.length) photos.push(...r.Photos.slice(0, 3));
  else if (r.profileImageUrl) photos.push(r.profileImageUrl);
  else if (r.images?.profile?.url) photos.push(r.images.profile.url);

  return {
    id: `opentable-${r.Id || r.rid || r.id}`,
    name: r.Name || r.name || 'Unknown',
    platform: 'opentable',
    cuisine: Array.isArray(r.CuisineList) ? r.CuisineList.join(', ') : (r.Cuisine || r.cuisine || 'Restaurant'),
    neighborhood: r.Neighborhood || r.neighborhood || '',
    address: r.Address || r.address || '',
    price: PRICE_MAP[r.PriceRange || r.priceRange] || '$$',
    rating: r.OverallRating || r.rating ? parseFloat(r.OverallRating || r.rating).toFixed(1) : null,
    reviewCount: r.ReviewCount || r.reviewCount || 0,
    photos,
    description: r.Description || r.description || '',
    bookingUrl: `https://www.opentable.com/r/${r.UrlName || r.urlName || r.Id || r.id}`,
    slots: [],
  };
}

function addHours(timeStr, hours) {
  const [h, m] = timeStr.split(':').map(Number);
  const newH = Math.min(23, h + hours);
  return `${String(newH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

module.exports = { searchRestaurants, normalizeRestaurant, addHours };
