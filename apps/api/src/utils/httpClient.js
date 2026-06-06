const axios = require('axios');

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
};

function createClient(baseURL, extraHeaders = {}) {
  return axios.create({
    baseURL,
    timeout: 12000,
    headers: { ...BROWSER_HEADERS, ...extraHeaders },
  });
}

module.exports = { createClient, BROWSER_HEADERS };
