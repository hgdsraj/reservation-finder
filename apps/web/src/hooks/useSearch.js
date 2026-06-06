import { useState, useRef, useCallback } from 'react';
import { fetchOpenTable, fetchResy, fetchTock } from '../utils/platformFetchers.js';

const RESY_PRICE_MAP = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };
const RESY_CITY_CODES = {
  'new york': 'ny', 'new york city': 'ny', 'nyc': 'ny', 'manhattan': 'ny',
  'chicago': 'ch', 'los angeles': 'la', 'san francisco': 'sf', 'miami': 'miami',
  'washington': 'dc', 'boston': 'bos', 'las vegas': 'lv', 'seattle': 'sea',
  'denver': 'den', 'austin': 'aus', 'nashville': 'nas', 'houston': 'hou',
  'atlanta': 'atl', 'portland': 'pdx', 'philadelphia': 'phi', 'dallas': 'dal',
  'new orleans': 'no', 'minneapolis': 'min', 'vancouver': 'vancouver',
  'toronto': 'toronto', 'london': 'london',
};

function getCityCode(name = '') {
  const k = name.toLowerCase();
  if (RESY_CITY_CODES[k]) return RESY_CITY_CODES[k];
  for (const [city, code] of Object.entries(RESY_CITY_CODES)) {
    if (k.includes(city) || city.includes(k)) return code;
  }
  return null;
}

function normalizeResyVenue(v, date, partySize, cityCode) {
  const venue = v.venue || v;
  const loc = venue?.location || {};
  const slug = venue?.urlSlug;
  const code = cityCode || getCityCode(loc.city || '');

  const slots = (v.slots || []).map((s) => {
    const raw = s.date?.start;
    const time = raw
      ? new Date(raw).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '';
    const url = code && slug
      ? `https://resy.com/cities/${code}/${slug}?date=${date}&seats=${partySize}`
      : slug ? `https://resy.com/${slug}` : 'https://resy.com';
    return { time, url };
  }).filter((s) => s.time);

  const bookingUrl = code && slug
    ? `https://resy.com/cities/${code}/${slug}`
    : slug ? `https://resy.com/${slug}` : 'https://resy.com';

  return {
    id: `resy-${venue?.id?.resy || slug || Math.random().toString(36).slice(2)}`,
    name: venue?.name || 'Unknown',
    platform: 'resy',
    cuisine: (venue?.cuisine || []).join(', ') || venue?.type || 'Restaurant',
    neighborhood: loc.neighborhood || loc.locality || '',
    address: loc.address_1 || '',
    price: RESY_PRICE_MAP[venue?.price_range_id] || '$$',
    rating: venue?.rating?.average != null ? parseFloat(venue.rating.average).toFixed(1) : null,
    reviewCount: venue?.rating?.count || 0,
    photos: (venue?.images || []).filter(Boolean),
    description: venue?.content?.[0]?.body?.[0]?.text || '',
    bookingUrl,
    slots,
    lat: loc.lat_long?.latitude || null,
    lng: loc.lat_long?.longitude || null,
  };
}

function normalizeTockExperience(e, date) {
  const biz = e.business;
  if (!biz?.name) return null;
  const photos = [];
  if (biz.backgroundImage?.url) photos.push(biz.backgroundImage.url);
  if (e.heroImages?.length) photos.push(...e.heroImages.map((i) => i.url).filter(Boolean));
  const slots = (e.slots || e.availabilities || [])
    .map((s) => ({ time: s.time || s.startTime || '', url: `https://www.exploretock.com/${biz.slug || ''}` }))
    .filter((s) => s.time);
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
    slots,
    lat: null,
    lng: null,
  };
}

export function useSearch() {
  const [restaurants, setRestaurants] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [platformStatus, setPlatformStatus] = useState({});
  const [errors, setErrors] = useState([]);
  const [cityData, setCityData] = useState(null);
  const esRef = useRef(null);

  const search = useCallback(({ city, date, partySize, time, selectedPlace }) => {
    if (esRef.current) esRef.current.close();

    setRestaurants([]);
    setErrors([]);
    setStatus('Connecting...');
    setLoading(true);
    setPlatformStatus({});
    setCityData(null);

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
      ? { lat: selectedPlace.lat, lng: selectedPlace.lng, city: selectedPlace.city || resolvedCity, label: resolvedCity }
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
      if (incoming?.length) setRestaurants((prev) => dedupeAndMerge(prev, incoming));
    });

    es.addEventListener('enriched', (e) => {
      const { restaurants: enriched } = JSON.parse(e.data);
      if (enriched?.length) setRestaurants(enriched);
    });

    es.addEventListener('platform_error', (e) => {
      const { platform } = JSON.parse(e.data);
      setPlatformStatus((prev) => ({ ...prev, [platform]: 'error' }));
    });

    es.addEventListener('done', () => {
      es.close();
      const cityCode = getCityCode(cityInfo?.city || resolvedCity);

      setPlatformStatus((prev) => ({
        ...prev,
        opentable: 'loading',
        tock: 'loading',
        resy: prev.resy === 'done' ? 'done' : 'loading',
      }));

      // Browser-side OpenTable — widget API has CORS enabled for embedding
      fetchOpenTable({ city: resolvedCity, cityData: cityInfo, date, partySize, time })
        .then((results) => {
          if (results.length) setRestaurants((prev) => dedupeAndMerge(prev, results));
          setPlatformStatus((prev) => ({ ...prev, opentable: 'done' }));
        })
        .catch(() => setPlatformStatus((prev) => ({ ...prev, opentable: 'error' })));

      // Browser-side Resy supplement
      if (cityInfo?.lat) {
        fetchResy({ cityData: cityInfo, date, partySize })
          .then((venues) => {
            const normalized = venues
              .map((v) => normalizeResyVenue(v, date, partySize, cityCode))
              .filter(Boolean);
            if (normalized.length) setRestaurants((prev) => dedupeAndMerge(prev, normalized));
            setPlatformStatus((prev) => ({ ...prev, resy: 'done' }));
          })
          .catch(() =>
            setPlatformStatus((prev) => ({ ...prev, resy: prev.resy === 'done' ? 'done' : 'error' }))
          );
      } else {
        setPlatformStatus((prev) => ({ ...prev, resy: prev.resy || 'error' }));
      }

      // Browser-side Tock
      fetchTock({ city: resolvedCity, cityData: cityInfo, date, partySize })
        .then((items) => {
          const normalized = items.map((e) => normalizeTockExperience(e, date)).filter(Boolean);
          if (normalized.length) setRestaurants((prev) => dedupeAndMerge(prev, normalized));
          setPlatformStatus((prev) => ({ ...prev, tock: 'done' }));
        })
        .catch(() => setPlatformStatus((prev) => ({ ...prev, tock: 'error' })));

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

  return { restaurants, status, loading, platformStatus, errors, cityData, search };
}

function dedupeAndMerge(existing, incoming) {
  const map = new Map(existing.map((r) => [r.id, r]));
  for (const r of incoming) {
    if (!map.has(r.id)) map.set(r.id, r);
  }
  return Array.from(map.values());
}
