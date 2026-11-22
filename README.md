# nela

Every Bangalore flat, checked before you visit. A research site for flat buyers built on public
Karnataka RERA filings: real carpet area, true possession dates and every extension, each builder's
delivery record, and distance to where you work. Google ratings and reviews load live.

## Layout

| Path | What it is |
| --- | --- |
| `pipeline/` | Node scripts that crawl RERA, look things up with Google and build the site's data |
| `data/` | Public RERA data from the crawl (`rera-list.json`, `details/<id>.json`), committed nightly |
| `web/` | The website (Vite + React + TypeScript, static) |
| `.github/workflows/refresh.yml` | Nightly refresh and deploy to GitHub Pages |

## Data pipeline

```sh
cd pipeline && npm ci
npm run crawl     # RERA list for Bengaluru Urban + Rural, then details for new/changed projects
npm run geocode   # coordinates RERA lacks, commute hubs (needs GOOGLE_MAPS_API_KEY)
npm run places    # Google place IDs for reviews, metro stations (needs GOOGLE_MAPS_API_KEY)
npm run build     # writes web/public/data/projects.json and meta.json
npm test
```

**Crawl etiquette.** One request at a time, 3 s apart (`CRAWL_DELAY_MS`), a descriptive User-Agent,
long back-off on errors. RERA has no robots.txt. After the first run, a night touches only the list
page plus projects whose status, completion date or extensions changed.

**What's stored.** Project facts only. RERA pages also show partners' and land owners' names, PAN
numbers, home addresses and bank accounts; the parser never extracts those.

**Google terms.** Only place IDs are kept long term. Coordinates and station locations are cached for
at most 30 days and never committed (`data/google/` is git-ignored, cached between Action runs).
Ratings and reviews are fetched live in the browser and shown with Google's attribution.

**Where the crawl runs.** RERA Karnataka refuses some non-Indian servers. If the nightly Action's
crawl step fails, run `npm run crawl` from a machine in India and push `data/`; the Action still
rebuilds and deploys from the committed data.

## Website

```sh
cd web && npm ci
cp ../.env.example ../.env   # add VITE_GOOGLE_MAPS_API_KEY
npm run dev
```

Without a browser key the site works but shows no map, reviews or drive times.

## Deploying (GitHub Pages)

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions: add secrets `GOOGLE_MAPS_API_KEY` and
   `VITE_GOOGLE_MAPS_API_KEY`. Optional variables: `VITE_GOOGLE_MAP_ID`, `SITE_BASE` (use `/` with a
   custom domain).
3. Run the **Nightly refresh and deploy** workflow once by hand.
