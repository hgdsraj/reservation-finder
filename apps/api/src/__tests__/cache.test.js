const { cache, cacheKey } = require('../utils/cache');

beforeEach(() => cache.clear());

describe('cacheKey', () => {
  test('produces consistent lowercase keys', () => {
    expect(cacheKey('opentable', 'New York', '2026-07-01', 2)).toBe('opentable:new york:2026-07-01:2');
    expect(cacheKey('resy', '  Chicago  ', '2026-07-01', 4)).toBe('resy:chicago:2026-07-01:4');
  });

  test('different platforms produce different keys', () => {
    const a = cacheKey('opentable', 'nyc', '2026-07-01', 2);
    const b = cacheKey('resy', 'nyc', '2026-07-01', 2);
    expect(a).not.toBe(b);
  });
});

describe('cache', () => {
  test('stores and retrieves values', () => {
    cache.set('key1', [{ id: 1 }]);
    expect(cache.get('key1')).toEqual([{ id: 1 }]);
  });

  test('returns undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  test('has() reflects stored values', () => {
    cache.set('exists', true);
    expect(cache.has('exists')).toBe(true);
    expect(cache.has('missing')).toBe(false);
  });
});
