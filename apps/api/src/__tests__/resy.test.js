const { normalizeVenue } = require('../scrapers/resy');

const RAW_VENUE = {
  venue: {
    name: 'Le Bernardin',
    id: { resy: 777 },
    urlSlug: 'le-bernardin-new-york',
    cuisine: ['French', 'Seafood'],
    price_range_id: 4,
    location: { neighborhood: 'Midtown West', address_1: '155 W 51st St' },
    rating: { average: 4.9, count: 5000 },
    images: ['https://img.resy.com/photo.jpg'],
    content: [{ body: [{ text: 'Seafood temple by Eric Ripert.' }] }],
  },
  slots: [
    { date: { start: '2026-07-01T19:00:00' } },
    { date: { start: '2026-07-01T20:00:00' } },
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
  });

  test('extracts time slots', () => {
    const r = normalizeVenue(RAW_VENUE, '2026-07-01', 2);
    expect(r.slots).toHaveLength(2);
    expect(r.slots[0].url).toContain('le-bernardin-new-york');
  });

  test('handles missing cuisine array', () => {
    const raw = { ...RAW_VENUE, venue: { ...RAW_VENUE.venue, cuisine: undefined, type: 'Fine Dining' } };
    const r = normalizeVenue(raw, '2026-07-01', 2);
    expect(r.cuisine).toBe('Fine Dining');
  });

  test('handles missing rating gracefully', () => {
    const raw = { ...RAW_VENUE, venue: { ...RAW_VENUE.venue, rating: undefined } };
    const r = normalizeVenue(raw, '2026-07-01', 2);
    expect(r.rating).toBeNull();
    expect(r.reviewCount).toBe(0);
  });

  test('falls back to resy.com when no urlSlug', () => {
    const raw = { ...RAW_VENUE, venue: { ...RAW_VENUE.venue, urlSlug: undefined } };
    const r = normalizeVenue(raw, '2026-07-01', 2);
    expect(r.bookingUrl).toBe('https://resy.com');
  });
});
