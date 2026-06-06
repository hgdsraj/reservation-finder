const { normalizeCard } = require('../scrapers/tock');

describe('normalizeCard', () => {
  test('parses a card with distance, neighborhood, price and cuisine', () => {
    const card = {
      href: '/kissa-tanto',
      txt: 'Kissa Tanto 1.7 km · Central Vancouver · $$$ · Japanese x Italian',
      img: 'https://cdn.tock.com/kissa.jpg',
    };
    const r = normalizeCard(card, '2026-07-01', 2, '19:00');
    expect(r.id).toBe('tock-kissa-tanto');
    expect(r.name).toBe('Kissa Tanto');
    expect(r.platform).toBe('tock');
    expect(r.price).toBe('$$$');
    expect(r.neighborhood).toBe('Central Vancouver');
    expect(r.cuisine).toBe('Japanese x Italian');
    expect(r.photos).toEqual(['https://cdn.tock.com/kissa.jpg']);
  });

  test('parses a card with only distance, price and cuisine', () => {
    const card = { href: '/the-golden-boot-coquitlam', txt: 'The Golden Boot 18.9 km · $$ · Northern Italian Cuisine' };
    const r = normalizeCard(card, '2026-07-01', 2, '19:00');
    expect(r.name).toBe('The Golden Boot');
    expect(r.price).toBe('$$');
    expect(r.neighborhood).toBe('');
    expect(r.cuisine).toBe('Northern Italian Cuisine');
  });

  test('booking URL carries date, party size and time', () => {
    const card = { href: '/tetsusushibar', txt: 'Tetsu Sushi Bar 2 km · $$$$ · Japanese' };
    const r = normalizeCard(card, '2026-07-01', 5, '17:30');
    expect(r.bookingUrl).toContain('https://www.exploretock.com/tetsusushibar');
    expect(r.bookingUrl).toContain('date=2026-07-01');
    expect(r.bookingUrl).toContain('size=5');
    expect(r.bookingUrl).toContain(encodeURIComponent('17:30'));
  });

  test('defaults price to $$ when none present', () => {
    const card = { href: '/somewhere', txt: 'Somewhere 3 km · Cafe' };
    const r = normalizeCard(card, '2026-07-01', 2, '19:00');
    expect(r.price).toBe('$$');
  });

  test('returns null without an href', () => {
    expect(normalizeCard({ txt: 'No link' }, '2026-07-01', 2, '19:00')).toBeNull();
    expect(normalizeCard(null, '2026-07-01', 2, '19:00')).toBeNull();
  });

  test('ignores non-http images', () => {
    const card = { href: '/x', txt: 'X 1 km · $ · Thai', img: 'data:image/gif;base64,abc' };
    const r = normalizeCard(card, '2026-07-01', 2, '19:00');
    expect(r.photos).toEqual([]);
  });
});
