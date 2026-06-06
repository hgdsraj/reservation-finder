# TableFinder

Search Resy, OpenTable, Tock, SevenRooms, and TheFork simultaneously — results stream in live, any city, book direct.

## Local Development

**Prerequisites:** Node 18+, npm 9+

```bash
# Install all workspace dependencies (run from repo root)
npm install

# Start both API and web dev servers in one command
npm run dev
```

- API: `http://localhost:3001`
- Web: `http://localhost:5173`

To run them separately:

```bash
npm run dev --workspace=apps/api    # Express API on :3001
npm run dev --workspace=apps/web    # Vite + React on :5173
```

**Environment variables** (API, optional):

```bash
# apps/api/.env
RESY_API_KEY=VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5   # public key, already set as default
PORT=3001
```

No `.env` file is required to run locally — defaults are built in.

## Deploying to Railway

1. **Create a Railway project** at [railway.app](https://railway.app) and link your repo, or use the CLI:

```bash
npm install -g @railway/cli
railway login
railway init        # creates a new project
```

2. **Add two services** — one for API, one for web — or deploy them separately:

```bash
# Deploy the API service
railway up --service reservation-finder-api

# Deploy the web service  
railway up --service reservation-finder-web
```

3. **Set the `VITE_API_URL` variable** on the web service so the browser knows where the API lives:

```
VITE_API_URL=https://your-api-service.up.railway.app
```

Set it in Railway's dashboard under **Variables** for the web service, then redeploy.

4. **Root directory** — Railway needs to know each service's root. In the Railway dashboard, set:

| Service | Root Directory | Start Command |
|---------|---------------|---------------|
| API     | `apps/api`    | `npm start`   |
| Web     | `apps/web`    | `npm run build && npm run preview` |

Or use the `railway.json` / `nixpacks.toml` approach if you prefer config-as-code.

5. **Check it's live:**

```bash
railway open   # opens your deployed project in browser
railway logs   # tail live logs
```

## Running Tests

```bash
# All tests
npm test

# API only (Jest + supertest)
npm test --workspace=apps/api

# Web only (Vitest + React Testing Library)
npm test --workspace=apps/web
```

## Project Structure

```
reservation-finder/
├── apps/
│   ├── api/          Express backend — SSE streaming, Resy scraper, geocoding
│   └── web/          React + Vite + Tailwind frontend
├── scripts/          One-off API test scripts (inspect-resy.js, test-apis2.js)
└── package.json      npm workspaces root
```

## FAQ

**How does the multi-platform fetching work?**
The app uses a hybrid approach. Resy is fetched server-side (SSE) and simultaneously called directly from the browser. After the SSE stream closes, the browser fires additional requests to OpenTable and Tock — their widget/consumer APIs have CORS headers enabled for third-party embedding, so they work from a browser context even though they block server-side Node.js requests (Akamai/Cloudflare). SevenRooms and TheFork are attempted server-side but currently return 403/404 for most cities and show "blocked" in the status bar.

**Why do SevenRooms and TheFork show "blocked"?**
Both services block server-side scraping via Akamai/Cloudflare. Their APIs don't have CORS headers enabled for browser-side fetching either, so they can't be called from a browser without hitting CORS errors. The status indicator will say "blocked" for these platforms.

**Why is the city autocomplete required before searching?**
Geocoding is done via Nominatim (OpenStreetMap). You must confirm the dropdown selection so the app gets exact lat/lng coordinates — this prevents ambiguity (e.g. "Vancouver BC" vs "Vancouver WA") and enables proximity filtering.

**What is the proximity warning?**
If a search for a small city (e.g. Surrey or Osoyoos) returns restaurants whose coordinates are all >25 km away, a banner appears noting that results are from the nearest area, not the city itself.

**How does the multi-platform dropdown work?**
If the same restaurant name appears on multiple platforms (e.g. Resy + OpenTable), they are merged into one card. The top-left of the card shows all available platform badges — tap/click one to switch which platform's slots and booking link are shown.

**How do I add a new scraper platform?**
1. Add a scraper in `apps/api/src/scrapers/yourplatform.js` exporting `searchRestaurants({ city, cityData, date, partySize })`
2. Register it in `apps/api/src/routes/search.js`
3. Add a browser-side fetcher in `apps/web/src/utils/platformFetchers.js`
4. Add a normalizer in `apps/web/src/hooks/useSearch.js`
