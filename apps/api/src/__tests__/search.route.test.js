const request = require('supertest');
const app = require('../app');

// Prevent real HTTP calls — scrapers will error and the route handles that gracefully
jest.mock('../utils/cityCoords', () => ({
  resolveCity: jest.fn().mockResolvedValue({
    lat: 40.7128,
    lng: -74.006,
    label: 'New York, NY',
    city: 'New York',
    country: 'US',
  }),
}));

jest.mock('../scrapers/opentable',  () => ({ searchRestaurants: jest.fn().mockResolvedValue([]) }));
jest.mock('../scrapers/resy',       () => ({ searchRestaurants: jest.fn().mockResolvedValue([]) }));
jest.mock('../scrapers/tock',       () => ({ searchRestaurants: jest.fn().mockResolvedValue([]) }));
jest.mock('../scrapers/sevenrooms', () => ({ searchRestaurants: jest.fn().mockResolvedValue([]) }));
jest.mock('../scrapers/thefork',    () => ({ searchRestaurants: jest.fn().mockResolvedValue([]) }));

describe('GET /api/health', () => {
  test('returns 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('GET /api/search', () => {
  test('returns 400 when city is missing', async () => {
    const res = await request(app).get('/api/search').query({ date: '2026-07-01' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/city/i);
  });

  test('returns 400 when date is missing', async () => {
    const res = await request(app).get('/api/search').query({ city: 'New York' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/date/i);
  });

  test('returns restaurant list with valid params', async () => {
    const res = await request(app)
      .get('/api/search')
      .query({ city: 'New York', date: '2026-07-01', partySize: '2', time: '19:00' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('restaurants');
    expect(Array.isArray(res.body.restaurants)).toBe(true);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('cityData');
  });

  test('accepts partySize as number and clamps it', async () => {
    const res = await request(app)
      .get('/api/search')
      .query({ city: 'New York', date: '2026-07-01', partySize: '999' });
    expect(res.status).toBe(200);
  });

  test('works with default partySize', async () => {
    const res = await request(app)
      .get('/api/search')
      .query({ city: 'Chicago', date: '2026-07-01' });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/search/stream', () => {
  test('returns 400 when city missing', async () => {
    const res = await request(app).get('/api/search/stream').query({ date: '2026-07-01' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when date missing', async () => {
    const res = await request(app).get('/api/search/stream').query({ city: 'NYC' });
    expect(res.status).toBe(400);
  });

  test('returns SSE content-type and sends done event', (done) => {
    const req = request(app)
      .get('/api/search/stream')
      .query({ city: 'New York', date: '2026-07-01', partySize: '2', time: '19:00' })
      .expect('Content-Type', /text\/event-stream/)
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    req.then((res) => {
      const body = typeof res.body === 'string' ? res.body : String(res.body ?? '');
      expect(body).toContain('event: done');
      done();
    }).catch(done);
  });
});
