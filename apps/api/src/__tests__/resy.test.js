const { normalizeVenue } = require('../scrapers/resy');

// Fixture matches real Resy API field names (confirmed via inspect-resy.js)
const RAW_VENUE = {
  venue: {
    name: 'Le Bernardin',
    id: { resy: 777 },
    url_slug: 'le-bernardin-new-york',
    type: 'French, Seafood',
    price_range: 4,
    location: {
      neighborhood: 'Midtown West',
      address_1: '155 W 51st St',
      code: 'nyc',
      url_slug: 'new-york',
    },
    rating: 4.9,
    total_ratings: 5000,
    responsive_images: { urls: { abc123: { '4:3': { '800': 'https://img.resy.com/photo.jpg' } } } },
    content: [{ body: [{ text: 'Seafood temple by Eric Ripert.' }] }],
  },
  slots: [
    { date: { start: '2026-07-01 19:00:00' } },
    { date: { start: '2026-07-01 20:00:00' } },
  ],
};

describe('normalizeVenue', () => {
  test('maps all fields correctly', () => {
    const r = normalizeVenue(RAW_VENUE, '2026-07-01', 2);
    expect(r.id).toContain('resy-');
    expect(r.name).toBe('Le Bernardin');
    expect(r.platform).toBe('resy');
    expect(r.price).toBe('$$$$');
    expect(r.cuisine).toBe('French, Seafood');
    expect(r.neighborhood).toBe('Midtown West');
    expect(r.rating).toBe('4.9');
    expect(r.reviewCount).toBe(5000);
    expect(r.photos).toEqual(['https://img.resy.com/photo.jpg']);
    expect(r.description).toBe('Seafood temple by Eric Ripert.');
    expect(r.bookingUrl).toContain('le-bernardin-new-york');
    expect(r.bookingUrl).toContain('new-york');
  });

  test('extracts time slots with correct time and booking URL', () => {
    const r = normalizeVenue(RAW_VENUE, '2026-07-01', 2);
    expect(r.slots).toHaveLength(2);
    expect(r.slots[0].time).toBe('19:00');
    expect(r.slots[1].time).toBe('20:00');
    // Slots without a token fall back to the restaurant page URL
    expect(r.slots[0].url).toContain('le-bernardin-new-york');
  });

  test('uses token deeplink for slot URL when token is present', () => {
    const raw = {
      ...RAW_VENUE,
      slots: [{ date: { start: '2026-07-01 19:00:00' }, config: { token: 'rgs://resy/123/456' } }],
    };
    const r = normalizeVenue(raw, '2026-07-01', 2);
    expect(r.slots[0].url).toContain('/book/details');
    expect(r.slots[0].url).toContain(encodeURIComponent('rgs://resy/123/456'));
  });

  test('handles missing cuisine gracefully', () => {
    const raw = { ...RAW_VENUE, venue: { ...RAW_VENUE.venue, type: undefined } };
    const r = normalizeVenue(raw, '2026-07-01', 2);
    expect(r.cuisine).toBe('Restaurant');
  });

  test('handles missing rating gracefully', () => {
    const raw = { ...RAW_VENUE, venue: { ...RAW_VENUE.venue, rating: undefined, total_ratings: undefined } };
    const r = normalizeVenue(raw, '2026-07-01', 2);
    expect(r.rating).toBeNull();
    expect(r.reviewCount).toBe(0);
  });

  test('falls back to resy.com when no url_slug or code', () => {
    const raw = {
      ...RAW_VENUE,
      venue: { ...RAW_VENUE.venue, url_slug: undefined, location: { neighborhood: 'Midtown West' } },
    };
    const r = normalizeVenue(raw, '2026-07-01', 2);
    expect(r.bookingUrl).toBe('https://resy.com');
  });

  test('reads coordinates from location.geo', () => {
    const raw = {
      ...RAW_VENUE,
      venue: {
        ...RAW_VENUE.venue,
        location: { ...RAW_VENUE.venue.location, geo: { lat: 49.28, lon: -123.12 } },
      },
    };
    const r = normalizeVenue(raw, '2026-07-01', 2);
    expect(r.lat).toBe(49.28);
    expect(r.lng).toBe(-123.12);
  });
});
