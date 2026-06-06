import { useState, useRef, useCallback } from 'react';

export function useSearch() {
  const [restaurants, setRestaurants] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [platformStatus, setPlatformStatus] = useState({});
  const [errors, setErrors] = useState([]);
  const [cityData, setCityData] = useState(null);
  const esRef = useRef(null);

  const search = useCallback(({ city, date, partySize, time }) => {
    if (esRef.current) esRef.current.close();

    setRestaurants([]);
    setErrors([]);
    setStatus('Connecting...');
    setLoading(true);
    setPlatformStatus({});
    setCityData(null);

    const params = new URLSearchParams({ city, date, partySize, time });
    const apiBase = import.meta.env.VITE_API_URL || '';
    const url = `${apiBase}/api/search/stream?${params}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      setStatus(data.message);
      if (data.cityData) setCityData(data.cityData);
      if (data.phase && data.phase !== 'geocode' && data.phase !== 'search') {
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

    es.addEventListener('enriched', (e) => {
      const { restaurants: enriched } = JSON.parse(e.data);
      if (enriched?.length) setRestaurants(enriched);
    });

    es.addEventListener('platform_error', (e) => {
      const { platform, message } = JSON.parse(e.data);
      setPlatformStatus((prev) => ({ ...prev, [platform]: 'error' }));
      setErrors((prev) => [...prev, `${platform}: ${message}`]);
    });

    es.addEventListener('error', () => {
      if (es.readyState === EventSource.CLOSED) {
        setLoading(false);
        setStatus(null);
      }
    });

    es.addEventListener('done', (e) => {
      const { total } = JSON.parse(e.data);
      setStatus(`Found ${total} restaurants`);
      setLoading(false);
      es.close();
    });
  }, []);

  const cancel = useCallback(() => {
    esRef.current?.close();
    setLoading(false);
  }, []);

  return { restaurants, status, loading, platformStatus, errors, cityData, search, cancel };
}

function dedupeAndMerge(existing, incoming) {
  const map = new Map(existing.map((r) => [r.id, r]));
  for (const r of incoming) {
    if (!map.has(r.id)) map.set(r.id, r);
  }
  return Array.from(map.values());
}
