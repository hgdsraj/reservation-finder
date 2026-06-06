const { LRUCache } = require('lru-cache');

const cache = new LRUCache({
  max: 200,
  ttl: 1000 * 60 * 5, // 5 minutes
});

function cacheKey(platform, city, date, partySize) {
  return `${platform}:${city.toLowerCase().trim()}:${date}:${partySize}`;
}

module.exports = { cache, cacheKey };
