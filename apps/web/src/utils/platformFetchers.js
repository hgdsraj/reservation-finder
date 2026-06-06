// Browser-side platform fetchers — bypasses server-side bot detection (Akamai, Cloudflare)
// OpenTable's widget API has CORS enabled since it's designed for third-party embedding.
// Resy's API is called from their own website (cross-origin to api.resy.com) so CORS is allowed.

const RESY_API_KEY = 'VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5';
const PRICE_MAP = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

// ─── OpenTable ────────────────────────────────────────────────────────────────

export async function fetchOpenTable({ city, cityData, date, partySize, time }) {
  const params = new URLSearchParams({
    lang: 'en-US',
    page: 1,
    pageSize: 40,
    query: cityData?.city || city,
  });

  const res = await fetch(
    `https://www.opentable.com/widget/reservation/restaurant-search?${params}`,
    {
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://www.opentable.com/',
      },
    }
  );

  if (!res.ok) throw new Error(`OpenTable ${res.status}`);

  const data = await res.json();
  const raw = data.RestaurantList || data.restaurantList || [];
  if (!raw.length) return [];

  // Fetch availability concurrently (limit to first 20 to keep it fast)
  const results = await Promise.allSettled(
    raw.slice(0, 20).map((r) => fetchOTAvailability(r, date, partySize, time))
  );

  return [
    ...results.map((r, i) => (r.status === 'fulfilled' ? r.value : normalizeOT(raw[i]))),
    ...raw.slice(20).map(normalizeOT),
  ];
}

async function fetchOTAvailability(raw, date, partySize, time) {
  const r = normalizeOT(raw);
  const id = raw.Id || raw.id;
  if (!id) return r;

  const params = new URLSearchParams({
    rid: id,
    party_size: partySize,
    datetime: `${date}T${time}:00`,
    startTime: time,
    endTime: addHours(time, 3),
    lang: 'en-US',
    isPreferredTime: false,
  });

  try {
    const res = await fetch(
      `https://www.opentable.com/widget/reservation/restaurant-availability?${params}`,
      { headers: { Referer: 'https://www.opentable.com/' } }
    );
    if (!res.ok) return r;

    const data = await res.json();
    const slots = (data.availability || [])
      .map((s) => ({
        time: s.dateTime?.split('T')[1]?.slice(0, 5) || s.time || '',
        url: `https://www.opentable.com/booking/experiences-availability?rid=${id}&datetime=${encodeURIComponent(s.dateTime || '')}&covers=${partySize}`,
      }))
      .filter((s) => s.time);

    return { ...r, slots };
  } catch {
    return r;
  }
}

function normalizeOT(r) {
  const photos = r.Photos?.length
    ? r.Photos.slice(0, 3)
    : r.profileImageUrl
    ? [r.profileImageUrl]
    : r.images?.profile?.url
    ? [r.images.profile.url]
    : [];

  return {
    id: `opentable-${r.Id || r.id || Math.random().toString(36).slice(2)}`,
    name: r.Name || r.name || 'Unknown',
    platform: 'opentable',
    cuisine: Array.isArray(r.CuisineList) ? r.CuisineList.join(', ') : r.Cuisine || 'Restaurant',
    neighborhood: r.Neighborhood || r.neighborhood || '',
    address: r.Address || r.address || '',
    price: PRICE_MAP[r.PriceRange || r.priceRange] || '$$',
    rating: r.OverallRating ? parseFloat(r.OverallRating).toFixed(1) : null,
    reviewCount: r.ReviewCount || r.reviewCount || 0,
    photos,
    description: r.Description || r.description || '',
    bookingUrl: `https://www.opentable.com/r/${r.UrlName || r.urlName || r.Id || r.id}`,
    slots: [],
    lat: r.Latitude || r.latitude || null,
    lng: r.Longitude || r.longitude || null,
  };
}

// ─── Resy (browser-side backup) ───────────────────────────────────────────────

export async function fetchResy({ cityData, date, partySize }) {
  if (!cityData?.lat) return [];

  const params = new URLSearchParams({
    lat: cityData.lat,
    long: cityData.lng,
    day: date,
    party_size: partySize,
    per_page: 30,
    page: 1,
  });

  const res = await fetch(`https://api.resy.com/4/find?${params}`, {
    headers: {
      Authorization: `ResyAPI api_key="${RESY_API_KEY}"`,
      'X-Origin': 'https://resy.com',
      Referer: 'https://resy.com/',
      Origin: 'https://resy.com',
      Accept: 'application/json, text/plain, */*',
    },
  });

  if (!res.ok) throw new Error(`Resy ${res.status}`);

  const data = await res.json();
  return data?.results?.venues || [];
}

// ─── Tock (browser-side) ──────────────────────────────────────────────────────

export async function fetchTock({ city, cityData, date, partySize }) {
  const params = new URLSearchParams({
    q: cityData?.city || city,
    date,
    size: partySize,
    page: 0,
    type: 'restaurant',
    per_page: 24,
  });

  const res = await fetch(
    `https://www.exploretock.com/api/consumer/v2/search/experiences?${params}`,
    {
      headers: {
        Accept: 'application/json',
        Referer: 'https://www.exploretock.com/',
      },
    }
  );

  if (!res.ok) throw new Error(`Tock ${res.status}`);
  const data = await res.json();
  return data?.results || data?.experiences || [];
}

// ─── SevenRooms (browser-side) ────────────────────────────────────────────────

export async function fetchSevenRooms({ cityData, city, date, partySize }) {
  const params = new URLSearchParams({
    city: cityData?.city || city,
    venue_type: 'restaurant',
    limit: 20,
    offset: 0,
  });
  if (cityData?.lat) {
    params.set('lat', cityData.lat);
    params.set('long', cityData.lng);
  }

  const res = await fetch(
    `https://www.sevenrooms.com/api-yoa/search_venues?${params}`,
    {
      headers: {
        Accept: 'application/json',
        Referer: 'https://www.sevenrooms.com/',
        Origin: 'https://www.sevenrooms.com',
      },
    }
  );

  if (!res.ok) throw new Error(`SevenRooms ${res.status}`);
  const data = await res.json();
  return data?.venues || data?.results || [];
}

// ─── TheFork (browser-side) ───────────────────────────────────────────────────

export async function fetchTheFork({ cityData, city, date, partySize }) {
  const params = new URLSearchParams({
    location: cityData?.city || city,
    date,
    partySize,
    page: 1,
    perPage: 20,
    sort: 'overall_rating',
  });
  if (cityData?.lat) {
    params.set('lat', cityData.lat);
    params.set('lon', cityData.lng);
  }

  const res = await fetch(
    `https://www.thefork.com/api/restaurants?${params}`,
    {
      headers: {
        Accept: 'application/json',
        Referer: 'https://www.thefork.com/',
        Origin: 'https://www.thefork.com',
      },
    }
  );

  if (!res.ok) throw new Error(`TheFork ${res.status}`);
  const data = await res.json();
  return data?.data || data?.restaurants || data?.items || [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addHours(timeStr, hours) {
  const [h, m] = timeStr.split(':').map(Number);
  return `${String(Math.min(23, h + hours)).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}
