const { normalizeExperience, derivePriceRange } = require('../scrapers/tock');

const RAW_EXPERIENCE = {
  id: 'exp-1',
  description: 'A 12-course journey.',
  price: 295,
  tags: [{ name: 'Tasting Menu' }, { name: 'Fine Dining' }],
  slots: [{ time: '18:00' }, { time: '20:00' }],
  heroImages: [{ url: 'https://cdn.tock.com/hero.jpg' }],
  business: {
    id: 'biz-1',
    name: 'Alinea',
    slug: 'alinea',
    address: '1723 N Halsted St',
    neighborhood: 'Lincoln Park',
    backgroundImage: { url: 'https://cdn.tock.com/bg.jpg' },
  },
};

describe('normalizeExperience', () => {
  test('maps all fields correctly', () => {
    const r = normalizeExperience(RAW_EXPERIENCE);
    expect(r.id).toBe('tock-exp-1');
    expect(r.name).toBe('Alinea');
    expect(r.platform).toBe('tock');
    expect(r.cuisine).toBe('Tasting Menu, Fine Dining');
    expect(r.neighborhood).toBe('Lincoln Park');
    expect(r.address).toBe('1723 N Halsted St');
    expect(r.description).toBe('A 12-course journey.');
    expect(r.bookingUrl).toBe('https://www.exploretock.com/alinea');
  });

  test('extracts photos from both sources', () => {
    const r = normalizeExperience(RAW_EXPERIENCE);
    expect(r.photos).toContain('https://cdn.tock.com/bg.jpg');
    expect(r.photos).toContain('https://cdn.tock.com/hero.jpg');
  });

  test('extracts time slots', () => {
    const r = normalizeExperience(RAW_EXPERIENCE);
    expect(r.slots).toHaveLength(2);
    expect(r.slots[0].time).toBe('18:00');
    expect(r.slots[0].url).toContain('alinea');
  });

  test('returns null when business name missing', () => {
    expect(normalizeExperience({ ...RAW_EXPERIENCE, business: {} })).toBeNull();
    expect(normalizeExperience({ ...RAW_EXPERIENCE, business: undefined })).toBeNull();
  });
});

describe('derivePriceRange', () => {
  test.each([
    [undefined, '$$'],
    [0,   '$'],
    [20,  '$'],
    [50,  '$$'],
    [100, '$$$'],
    [200, '$$$$'],
  ])('price %s → %s', (price, expected) => {
    expect(derivePriceRange(price)).toBe(expected);
  });
});
