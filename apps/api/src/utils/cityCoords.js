const axios = require('axios');

const geocodeCache = new Map();

async function resolveCity(query) {
  if (!query?.trim()) return null;
  const key = query.toLowerCase().trim();
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  const res = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: query, format: 'json', limit: 1, addressdetails: 1 },
    headers: { 'User-Agent': 'ReservationFinder/1.0 (raj.axisos@gmail.com)' },
    timeout: 5000,
  });

  const place = res.data?.[0];
  if (!place) return null;

  const addr = place.address || {};
  const result = {
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon),
    label: place.display_name.split(',').slice(0, 2).join(',').trim(),
    city: addr.city || addr.town || addr.village || addr.county || query,
    country: addr.country_code?.toUpperCase() || 'US',
  };

  geocodeCache.set(key, result);
  return result;
}

module.exports = { resolveCity };
