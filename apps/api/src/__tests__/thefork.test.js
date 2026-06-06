const { normalizeRestaurant, mapPrice } = require('../scrapers/thefork');

const RAW_RESTAURANT = {
  uuid: 'tf-1',
  name: 'Sketch',
  avgRating: 4.6,
  reviewCount: 8200,
  priceRange: 4,
  servedCuisines: [{ label: 'British' }, { label: 'Contemporary' }],
  neighborhoodName: 'Mayfair',
  address: { street: '9 Conduit St' },
  mainPhoto: { source: 'https://cdn.thefork.com/sketch.jpg' },
  description: 'Michelin-starred London icon.',
  slug: 'sketch-london',
  availabilities: [
    { slot: '19:00' },
    { slot: '20:30' },
  ],
};

describe('normalizeRestaurant', () => {
  test('maps all fields correctly', () => {
    const r = normalizeRestaurant(RAW_RESTAURANT, '2026-07-01', 2);
    expect(r.id).toBe('thefork-tf-1');
    expect(r.name).toBe('Sketch');
    expect(r.platform).toBe('thefork');
    expect(r.cuisine).toBe('British, Contemporary');
    expect(r.neighborhood).toBe('Mayfair');
    expect(r.address).toBe('9 Conduit St');
    expect(r.rating).toBe('4.6');
    expect(r.reviewCount).toBe(8200);
    expect(r.photos).toContain('https://cdn.thefork.com/sketch.jpg');
    expect(r.description).toBe('Michelin-starred London icon.');
    expect(r.bookingUrl).toContain('sketch-london');
  });

  test('extracts slots', () => {
    const r = normalizeRestaurant(RAW_RESTAURANT, '2026-07-01', 2);
    expect(r.slots).toHaveLength(2);
    expect(r.slots[0].time).toBe('19:00');
  });

  test('returns null when name missing', () => {
    expect(normalizeRestaurant({ ...RAW_RESTAURANT, name: undefined }, '2026-07-01', 2)).toBeNull();
  });

  test('falls back to photo array', () => {
    const raw = { ...RAW_RESTAURANT, mainPhoto: undefined, pictures: ['https://cdn.thefork.com/alt.jpg'] };
    const r = normalizeRestaurant(raw, '2026-07-01', 2);
    expect(r.photos).toContain('https://cdn.thefork.com/alt.jpg');
  });
});

describe('mapPrice (TheFork)', () => {
  test.each([
    [1, '$'],
    [2, '$$'],
    [3, '$$$'],
    [4, '$$$$'],
    ['cheap', '$'],
    ['mid', '$$'],
    ['high', '$$$'],
    ['luxury', '$$$$'],
    [undefined, '$$'],
    ['unknown', '$$'],
  ])('priceRange %s → %s', (range, expected) => {
    expect(mapPrice(range)).toBe(expected);
  });
});
