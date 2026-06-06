import { useState, useRef, useCallback } from 'react';

// ─── Bbox region filter ───────────────────────────────────────────────────────
function filterByRegion(incoming, cityInfo) {
  if (!cityInfo?.bbox || !incoming.length) return incoming;
  const { south, north, west, east } = cityInfo.bbox;
  // Expand 20% on each side — catches restaurants at the exact city border
  const latPad = (north - south) * 0.20;
  const lngPad = (east - west) * 0.20;
  return incoming.filter((r) => {
    if (!r.lat || !r.lng) return true; // no coords → can't filter, keep it
    return r.lat >= south - latPad && r.lat <= north + latPad
        && r.lng >= west  - lngPad && r.lng <= east  + lngPad;
  });
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
  const esRef = useRef(null);

  const search = useCallback(({ city, date, partySize, time, selectedPlace }) => {
    if (esRef.current) esRef.current.close();

    setRestaurants([]);
    setErrors([]);
    setStatus('Connecting…');
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
        const inRegion = filterByRegion(incoming, cityInfo);
        if (inRegion.length) setRestaurants((prev) => dedupeAndMerge(prev, inRegion));
      }
    });

    es.addEventListener('platform_error', (e) => {
      const { platform } = JSON.parse(e.data);
      // All platforms run server-side now; a platform_error is terminal.
      setPlatformStatus((prev) => (prev[platform] === 'done' ? prev : { ...prev, [platform]: 'failed' }));
    });

    es.addEventListener('done', () => {
      es.close();
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
