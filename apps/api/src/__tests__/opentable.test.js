const { normalizeRestaurant, addHours } = require('../scrapers/opentable');

describe('normalizeRestaurant', () => {
  const raw = {
    Id: 12345,
    Name: 'The French Laundry',
    PriceRange: 4,
    CuisineList: ['French', 'American'],
    Neighborhood: 'Yountville',
    Address: '6640 Washington St',
    OverallRating: 4.8,
    ReviewCount: 2150,
    Photos: ['https://cdn.example.com/photo1.jpg'],
    Description: 'World-class tasting menu.',
    UrlName: 'the-french-laundry-yountville',
  };

  test('maps all fields correctly', () => {
    const r = normalizeRestaurant(raw);
    expect(r.id).toBe('opentable-12345');
    expect(r.name).toBe('The French Laundry');
    expect(r.platform).toBe('opentable');
    expect(r.price).toBe('$$$$');
    expect(r.cuisine).toBe('French, American');
    expect(r.rating).toBe('4.8');
    expect(r.reviewCount).toBe(2150);
    expect(r.photos).toEqual(['https://cdn.example.com/photo1.jpg']);
    expect(r.bookingUrl).toContain('the-french-laundry-yountville');
    expect(r.slots).toEqual([]);
  });

  test('defaults price to $$ when PriceRange missing', () => {
    const r = normalizeRestaurant({ ...raw, PriceRange: undefined });
    expect(r.price).toBe('$$');
  });

  test('handles missing photos gracefully', () => {
    const r = normalizeRestaurant({ ...raw, Photos: [] });
    expect(r.photos).toEqual([]);
  });

  test('handles single cuisine string', () => {
    const r = normalizeRestaurant({ ...raw, CuisineList: undefined, Cuisine: 'Italian' });
    expect(r.cuisine).toBe('Italian');
  });

  test('defaults name to Unknown when missing', () => {
    const r = normalizeRestaurant({ ...raw, Name: undefined });
    expect(r.name).toBe('Unknown');
  });

  test('null rating when OverallRating missing', () => {
    const r = normalizeRestaurant({ ...raw, OverallRating: undefined });
    expect(r.rating).toBeNull();
  });
});

describe('addHours', () => {
  test('adds hours correctly', () => {
    expect(addHours('19:00', 3)).toBe('22:00');
    expect(addHours('18:30', 2)).toBe('20:30');
  });

  test('clamps to 23:00', () => {
    expect(addHours('22:00', 5)).toBe('23:00');
  });

  test('preserves minutes', () => {
    expect(addHours('18:30', 1)).toBe('19:30');
  });
});
