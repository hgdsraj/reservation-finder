import { useState, useRef, useCallback } from 'react';
import { fetchOpenTable, fetchResy, fetchTock } from '../utils/platformFetchers.js';

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
  // City slug from location.url_slug (e.g. "vancouver-bc", "new-york")
  const citySlug = loc?.url_slug;

  const bookingBase = citySlug && slug
    ? `https://resy.com/cities/${citySlug}/${slug}`
    : slug ? `https://resy.com/${slug}` : 'https://resy.com';

  const slots = (v.slots || []).map((s) => {
    const raw = s.date?.start || '';
    const time = raw.includes(' ') ? raw.split(' ')[1]?.slice(0, 5) : '';
    return { time, url: `${bookingBase}?date=${date}&seats=${partySize}` };
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

    es.addEventListener('done', () => {
      es.close();

      // Browser-side Resy supplement (uses CORS-enabled api.resy.com)
      if (cityInfo?.lat) {
        setPlatformStatus((prev) => ({ ...prev, resy: prev.resy === 'done' ? 'done' : 'loading' }));
        fetchResy({ cityData: cityInfo, date, partySize })
          .then((venues) => {
            const normalized = venues.map((v) => normalizeResyVenue(v, date, partySize)).filter(Boolean);
            if (normalized.length) setRestaurants((prev) => dedupeAndMerge(prev, normalized));
            setPlatformStatus((prev) => ({ ...prev, resy: 'done' }));
          })
          .catch(() => setPlatformStatus((prev) => ({ ...prev, resy: prev.resy === 'done' ? 'done' : 'error' })));
      }

      // Browser-side OpenTable — try, might be CORS-blocked
      setPlatformStatus((prev) => ({ ...prev, opentable: 'loading' }));
      fetchOpenTable({ city: resolvedCity, cityData: cityInfo, date, partySize, time })
        .then((results) => {
          if (results.length) setRestaurants((prev) => dedupeAndMerge(prev, results));
          setPlatformStatus((prev) => ({ ...prev, opentable: results.length ? 'done' : 'unavailable' }));
        })
        .catch(() => setPlatformStatus((prev) => ({ ...prev, opentable: 'unavailable' })));

      // Browser-side Tock — try, might be CORS-blocked
      setPlatformStatus((prev) => ({ ...prev, tock: 'loading' }));
      fetchTock({ city: resolvedCity, cityData: cityInfo, date, partySize })
        .then((items) => {
          const normalized = items.map((e) => normalizeTockExperience(e)).filter(Boolean);
          if (normalized.length) setRestaurants((prev) => dedupeAndMerge(prev, normalized));
          setPlatformStatus((prev) => ({ ...prev, tock: normalized.length ? 'done' : 'unavailable' }));
        })
        .catch(() => setPlatformStatus((prev) => ({ ...prev, tock: 'unavailable' })));

      setLoading(false);
      setStatus(null);
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
