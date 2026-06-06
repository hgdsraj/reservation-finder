import { useState, useRef, useCallback } from 'react';
import { fetchOpenTable, fetchResy, fetchTock, fetchSevenRooms, fetchTheFork } from '../utils/platformFetchers.js';

const RESY_PRICE_MAP = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

// ─── Haversine distance (km) ──────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Resy normalizer (matches server-side field names exactly) ────────────────
function extractResyPhotos(venue) {
  const urls = venue?.responsive_images?.urls || {};
  const photos = Object.values(urls)
    .map((img) => img?.['4:3']?.['800'] || img?.['16:9']?.['800'] || img?.['1:1']?.['400'])
    .filter(Boolean);
  if (photos.length) return photos;
  const originals = venue?.responsive_images?.originals || {};
  return Object.values(originals).map((o) => o?.url).filter(Boolean);
}

function normalizeResyVenue(v, date, partySize) {
  const venue = v.venue || v;
  const loc = venue?.location || {};

  // API field is url_slug (snake_case), NOT urlSlug
  const slug = venue?.url_slug;
  // location.code is the short city code Resy uses in URLs (e.g. "vanc", "nyc", "sf")
  // location.url_slug ("vancouver-bc") does NOT match Resy's website URL format
  const cityCode = loc?.code;

  const bookingBase = cityCode && slug
    ? `https://resy.com/cities/${cityCode}/${slug}`
    : slug ? `https://resy.com/${slug}` : 'https://resy.com';

  const slots = (v.slots || []).map((s) => {
    const raw = s.date?.start || '';
    const time = raw.includes(' ') ? raw.split(' ')[1]?.slice(0, 5) : '';
    const token = s.config?.token;
    const url = token
      ? `https://resy.com/book/details?token=${encodeURIComponent(token)}&date=${date}&seats=${partySize}`
      : `${bookingBase}?date=${date}&seats=${partySize}`;
    return { time, url };
  }).filter((s) => s.time);

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
    price: RESY_PRICE_MAP[venue?.price_range] || '$$',
    rating,
    reviewCount: venue?.total_ratings || 0,
    photos: extractResyPhotos(venue),
    description: (venue?.content || []).find((c) => c.body?.length > 0)?.body?.[0]?.text || '',
    bookingUrl: bookingBase,
    slots,
    // Coordinates at location.geo.lat/lon (NOT lat_long.latitude)
    lat: loc?.geo?.lat || null,
    lng: loc?.geo?.lon || null,
  };
}

function normalizeTockExperience(e) {
  const biz = e.business;
  if (!biz?.name) return null;
  const photos = [];
  if (biz.backgroundImage?.url) photos.push(biz.backgroundImage.url);
  if (e.heroImages?.length) photos.push(...e.heroImages.map((i) => i.url).filter(Boolean));
  const p = e.price || e.minimumPrice;
  return {
    id: `tock-${e.id || biz.id || Math.random().toString(36).slice(2)}`,
    name: biz.name,
    platform: 'tock',
    cuisine: (e.tags || []).map((t) => t.name).join(', ') || biz.cuisine || 'Restaurant',
    neighborhood: biz.neighborhood || '',
    address: biz.address || '',
    price: p == null ? '$$' : p < 30 ? '$' : p < 75 ? '$$' : p < 150 ? '$$$' : '$$$$',
    rating: null,
    reviewCount: 0,
    photos,
    description: e.description || biz.description || '',
    bookingUrl: biz.slug ? `https://www.exploretock.com/${biz.slug}` : 'https://www.exploretock.com',
    slots: [],
    lat: null,
    lng: null,
  };
}

function normalizeSevenRooms(v, date, partySize) {
  if (!v?.name) return null;
  const photos = [v.background_image_url, v.logo_url].filter(Boolean);
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
    neighborhood: v.neighborhood || '',
    address: v.address || '',
    price: { low: '$', medium: '$$', high: '$$$', very_high: '$$$$' }[v.price_range] || '$$',
    rating: v.overall_rating ? parseFloat(v.overall_rating).toFixed(1) : null,
    reviewCount: v.review_count || 0,
    photos,
    description: v.description || v.tagline || '',
    bookingUrl: v.url_name ? `https://www.sevenrooms.com/reservations/${v.url_name}` : 'https://www.sevenrooms.com',
    slots,
    lat: v.lat || null,
    lng: v.lon || null,
  };
}

function normalizeTheFork(r, date, partySize) {
  if (!r?.name) return null;
  const photos = [r.mainPhoto?.source, r.photo, r.pictures?.[0]].filter(Boolean);
  const slug = r.slug || r.urlName;
  const bookingUrl = slug
    ? `https://www.thefork.com/restaurant/${slug}?date=${date}&partySize=${partySize}`
    : 'https://www.thefork.com';
  const slots = (r.availabilities || r.availability || []).map((s) => ({
    time: s.slot || s.time || '',
    url: r.url || bookingUrl,
  })).filter((s) => s.time);
  return {
    id: `thefork-${r.uuid || r.id || Math.random().toString(36).slice(2)}`,
    name: r.name,
    platform: 'thefork',
    cuisine: r.servedCuisines?.map((c) => c.label).join(', ') || r.cuisineType || 'Restaurant',
    neighborhood: r.neighborhoodName || r.district || '',
    address: r.address?.street || r.address || '',
    price: { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }[r.priceRange] || '$$',
    rating: r.avgRating ? parseFloat(r.avgRating).toFixed(1) : null,
    reviewCount: r.reviewCount || r.ratingsCount || 0,
    photos,
    description: r.description || r.tagline || '',
    bookingUrl,
    slots,
    lat: r.location?.lat || r.lat || null,
    lng: r.location?.lng || r.lng || null,
  };
}

// ─── Dedupe + multi-platform grouping ────────────────────────────────────────
function normName(n) {
  return (n || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function dedupeAndMerge(existing, incoming) {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const byName = new Map(existing.map((r) => [normName(r.name), r]));

  for (const r of incoming) {
    if (byId.has(r.id)) continue;

    const nameKey = normName(r.name);
    const match = byName.get(nameKey);

    if (match && match.platform !== r.platform) {
      // Same restaurant on different platform — add as alternative booking option
      if (!match.alternatives) match.alternatives = [];
      const alreadyAdded = match.alternatives.some((a) => a.platform === r.platform);
      if (!alreadyAdded) {
        match.alternatives.push({
          platform: r.platform,
          bookingUrl: r.bookingUrl,
          slots: r.slots,
          photos: r.photos,
        });
      }
      // Still register by ID so we don't add it again
      byId.set(r.id, match);
    } else {
      byId.set(r.id, r);
      byName.set(nameKey, r);
    }
  }

  return Array.from(byName.values());
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useSearch() {
  const [restaurants, setRestaurants] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [platformStatus, setPlatformStatus] = useState({});
  const [errors, setErrors] = useState([]);
  const [cityData, setCityData] = useState(null);
  const [proximityWarning, setProximityWarning] = useState(null);
  const esRef = useRef(null);

  const search = useCallback(({ city, date, partySize, time, selectedPlace }) => {
    if (esRef.current) esRef.current.close();

    setRestaurants([]);
    setErrors([]);
    setStatus('Connecting…');
    setLoading(true);
    setPlatformStatus({});
    setCityData(null);
    setProximityWarning(null);

    const params = new URLSearchParams({ city, date, partySize, time });
    if (selectedPlace?.lat) {
      params.set('lat', selectedPlace.lat);
      params.set('lng', selectedPlace.lng);
    }

    const apiBase = import.meta.env.VITE_API_URL || '';
    const es = new EventSource(`${apiBase}/api/search/stream?${params}`);
    esRef.current = es;

    const resolvedCity = selectedPlace?.label || city;
    const cityInfo = selectedPlace
      ? { lat: selectedPlace.lat, lng: selectedPlace.lng, city: selectedPlace.city || resolvedCity, label: resolvedCity, bbox: selectedPlace.bbox }
      : null;

    if (cityInfo) setCityData(cityInfo);

    es.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      setStatus(data.message);
      if (data.cityData && !cityInfo) setCityData(data.cityData);
      if (data.phase && !['geocode', 'search'].includes(data.phase)) {
        setPlatformStatus((prev) => ({ ...prev, [data.phase]: 'loading' }));
      }
    });

    es.addEventListener('restaurants', (e) => {
      const { platform, restaurants: incoming } = JSON.parse(e.data);
      setPlatformStatus((prev) => ({ ...prev, [platform]: 'done' }));
      if (incoming?.length) {
        setRestaurants((prev) => dedupeAndMerge(prev, incoming));
      }
    });

    es.addEventListener('platform_error', (e) => {
      const { platform } = JSON.parse(e.data);
      // Server-side failure — will retry browser-side below
      setPlatformStatus((prev) => ({ ...prev, [platform]: 'loading' }));
    });

    es.addEventListener('done', () => {
      es.close();
      setLoading(false);
      setStatus(null);

      // Mark all browser-side platforms as loading immediately
      setPlatformStatus((prev) => ({
        ...prev,
        opentable: prev.opentable === 'done' ? 'done' : 'loading',
        tock:       prev.tock      === 'done' ? 'done' : 'loading',
        sevenrooms: prev.sevenrooms === 'done' ? 'done' : 'loading',
        thefork:    prev.thefork   === 'done' ? 'done' : 'loading',
        resy:       prev.resy      === 'done' ? 'done' : 'loading',
      }));

      // Fire all browser-side requests in parallel
      const args = { city: resolvedCity, cityData: cityInfo, date, partySize, time };

      function run(platform, fetcher, normalize) {
        fetcher(args)
          .then((raw) => {
            const results = normalize ? raw.map(normalize).filter(Boolean) : raw;
            if (results.length) setRestaurants((prev) => dedupeAndMerge(prev, results));
            setPlatformStatus((prev) => ({ ...prev, [platform]: 'done' }));
          })
          .catch(() => setPlatformStatus((prev) => {
            // Don't overwrite an already-successful server-side result
            if (prev[platform] === 'done') return prev;
            return { ...prev, [platform]: 'failed' };
          }));
      }

      if (cityInfo?.lat) run('resy',       fetchResy,       (v) => normalizeResyVenue(v, date, partySize));
      run('opentable',  fetchOpenTable,  null);
      run('tock',       fetchTock,       (e) => normalizeTockExperience(e));
      run('sevenrooms', fetchSevenRooms, (v) => normalizeSevenRooms(v, date, partySize));
      run('thefork',    fetchTheFork,    (r) => normalizeTheFork(r, date, partySize));
    });

    es.addEventListener('error', () => {
      if (es.readyState === EventSource.CLOSED) {
        setLoading(false);
        setStatus(null);
      }
    });
  }, []);

  // After restaurants update, check if any are close to the searched city
  const checkProximity = useCallback((rests, cd) => {
    if (!cd?.lat || !rests.length) return;
    const withCoords = rests.filter((r) => r.lat && r.lng);
    if (!withCoords.length) return;
    const anyNearby = withCoords.some((r) => haversine(cd.lat, cd.lng, r.lat, r.lng) <= 25);
    if (!anyNearby) {
      setProximityWarning(`No reservations found within ${cd.label}. Showing nearest available restaurants.`);
    } else {
      setProximityWarning(null);
    }
  }, []);

  // Expose a way to trigger proximity check from App after loading finishes
  return { restaurants, status, loading, platformStatus, errors, cityData, proximityWarning, search, checkProximity };
}
