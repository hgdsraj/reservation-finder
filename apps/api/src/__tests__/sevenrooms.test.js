const { normalizeVenue, derivePriceRange } = require('../scrapers/sevenrooms');

const RAW_VENUE = {
  id: 'sr-1',
  name: 'Nobu',
  url_name: 'nobu-new-york',
  venue_category_display: 'Japanese',
  neighborhood: 'TriBeCa',
  address: '105 Hudson St',
  overall_rating: 4.7,
  review_count: 3200,
  description: 'Legendary Japanese-Peruvian fusion.',
  tagline: 'The original Nobu.',
  background_image_url: 'https://cdn.sevenrooms.com/nobu.jpg',
  price_range: 'high',
  availability: [
    { time_slot: '18:30' },
    { time_slot: '20:00' },
  ],
};

describe('normalizeVenue', () => {
  test('maps all fields correctly', () => {
    const r = normalizeVenue(RAW_VENUE, '2026-07-01', 2);
    expect(r.id).toBe('sevenrooms-sr-1');
    expect(r.name).toBe('Nobu');
    expect(r.platform).toBe('sevenrooms');
    expect(r.cuisine).toBe('Japanese');
    expect(r.neighborhood).toBe('TriBeCa');
    expect(r.rating).toBe('4.7');
    expect(r.reviewCount).toBe(3200);
    expect(r.price).toBe('$$$');
    expect(r.photos).toContain('https://cdn.sevenrooms.com/nobu.jpg');
    expect(r.bookingUrl).toContain('nobu-new-york');
  });

  test('extracts slots', () => {
    const r = normalizeVenue(RAW_VENUE, '2026-07-01', 2);
    expect(r.slots).toHaveLength(2);
    expect(r.slots[0].time).toBe('18:30');
    expect(r.slots[0].url).toContain('nobu-new-york');
  });

  test('returns null when name missing', () => {
    expect(normalizeVenue({ ...RAW_VENUE, name: undefined }, '2026-07-01', 2)).toBeNull();
  });

  test('falls back to sevenrooms.com when no url_name', () => {
    const r = normalizeVenue({ ...RAW_VENUE, url_name: undefined }, '2026-07-01', 2);
    expect(r.bookingUrl).toBe('https://www.sevenrooms.com');
  });
});

describe('derivePriceRange (SevenRooms)', () => {
  test.each([
    ['low', '$'],
    ['medium', '$$'],
    ['high', '$$$'],
    ['very_high', '$$$$'],
    [undefined, '$$'],
    ['unknown_value', '$$'],
    [1, '$'],
    [2, '$$'],
    [3, '$$$'],
    [4, '$$$$'],
  ])('range %s → %s', (range, expected) => {
    expect(derivePriceRange(range)).toBe(expected);
  });
});
