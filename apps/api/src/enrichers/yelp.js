const axios = require('axios');

const YELP_KEY = process.env.YELP_API_KEY;

async function enrichWithYelp(restaurants, cityData) {
  if (!YELP_KEY || !cityData) return restaurants;

  try {
    const res = await axios.get('https://api.yelp.com/v3/businesses/search', {
      headers: { Authorization: `Bearer ${YELP_KEY}` },
      params: {
        latitude: cityData.lat,
        longitude: cityData.lng,
        term: 'restaurant',
        limit: 50,
        sort_by: 'rating',
      },
      timeout: 8000,
    });

    const yelpMap = new Map();
    for (const b of res.data?.businesses || []) {
      yelpMap.set(normalize(b.name), b);
    }

    return restaurants.map((r) => {
      const match = yelpMap.get(normalize(r.name));
      if (!match) return r;
      return {
        ...r,
        rating: r.rating || String(match.rating),
        reviewCount: r.reviewCount || match.review_count,
        photos: r.photos.length ? r.photos : [match.image_url].filter(Boolean),
        description: r.description || match.categories?.map((c) => c.title).join(', ') || r.description,
        yelpUrl: match.url,
      };
    });
  } catch {
    return restaurants;
  }
}

function normalize(name = '') {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

module.exports = { enrichWithYelp };
