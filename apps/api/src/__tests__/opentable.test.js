const { normalizeRestaurant } = require('../scrapers/opentable');

// Shape mirrors OpenTable's HomeModuleLists GraphQL restaurant objects.
const raw = {
  restaurantId: 12345,
  name: 'The French Laundry',
  urls: { profileLink: { link: 'https://www.opentable.com/r/the-french-laundry-yountville' } },
  coordinates: { latitude: 38.4019, longitude: -122.3616 },
  priceBand: { priceBandId: 4 },
  primaryCuisine: { name: 'French' },
  neighborhood: { name: 'Yountville' },
  statistics: { reviews: { allTimeTextReviewCount: 2150 } },
  photo: { url: 'https://cdn.example.com/photo1.jpg' },
  description: 'World-class tasting menu.',
};

describe('normalizeRestaurant', () => {
  test('maps core fields', () => {
    const r = normalizeRestaurant(raw, '2026-07-01', 2, '19:00');
    expect(r.id).toBe('opentable-12345');
    expect(r.name).toBe('The French Laundry');
    expect(r.platform).toBe('opentable');
    expect(r.price).toBe('$$$$');
    expect(r.cuisine).toBe('French');
    expect(r.neighborhood).toBe('Yountville');
    expect(r.reviewCount).toBe(2150);
    expect(r.photos).toEqual(['https://cdn.example.com/photo1.jpg']);
    expect(r.lat).toBe(38.4019);
    expect(r.lng).toBe(-122.3616);
  });

  test('booking URL carries the searched date, time and party size', () => {
    const r = normalizeRestaurant(raw, '2026-07-01', 4, '17:30');
    expect(r.bookingUrl).toContain('the-french-laundry-yountville');
    expect(r.bookingUrl).toContain(encodeURIComponent('2026-07-01T17:30'));
    expect(r.bookingUrl).toContain('covers=4');
  });

  test('defaults price to $$ when priceBand missing', () => {
    const r = normalizeRestaurant({ ...raw, priceBand: undefined }, '2026-07-01', 2, '19:00');
    expect(r.price).toBe('$$');
  });

  test('handles missing photo gracefully', () => {
    const r = normalizeRestaurant({ ...raw, photo: undefined }, '2026-07-01', 2, '19:00');
    expect(r.photos).toEqual([]);
  });

  test('builds per-slot links from raw availability times', () => {
    const r = normalizeRestaurant(raw, '2026-07-01', 2, '19:00', ['2026-07-01T18:30', '2026-07-01T19:00']);
    expect(r.slots).toHaveLength(2);
    expect(r.slots[0].time).toBe('18:30');
    expect(r.slots[0].url).toContain(encodeURIComponent('2026-07-01T18:30'));
  });

  test('no slots when availability is absent', () => {
    const r = normalizeRestaurant(raw, '2026-07-01', 2, '19:00');
    expect(r.slots).toEqual([]);
  });
});
