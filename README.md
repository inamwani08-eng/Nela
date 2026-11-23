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

**Google terms.** Only place IDs are kept long term (`data/google/places.json`). Coordinates and
station locations are cached for at most 30 days and never committed (cached between Action runs).
Ratings and reviews are fetched live in the browser and shown with Google's attribution.

**Where the crawl runs.** RERA Karnataka blocks servers outside India, including GitHub's own
runners. The nightly crawl (`.github/workflows/crawl.yml`, 02:00 IST) therefore runs on a self-hosted
runner on a Windows PC in India. When it finishes, **Nightly refresh and deploy** rebuilds and
deploys on GitHub's runners. If the PC is off, that night is skipped and the site keeps the last data.
The schedule is off until that runner exists.

**Manual refresh (no runner).** From any browser in India:
`node pipeline/tools/browser-crawl.mjs > crawl.js`, run `crawl.js` in the devtools console on a
rera.karnataka.gov.in page, wait for `window.__nela.phase === 'done'` (it downloads
`nela-rera-update.json`), then `node pipeline/tools/import-browser-crawl.mjs <file>`, `npm run build`
in `pipeline/`, and push `data/`. Only new or changed projects are fetched.

### Setting up the crawl runner (Windows PC, once)

1. Install [Git for Windows](https://git-scm.com/download/win) if it isn't already there.
2. In the repo: Settings → Actions → Runners → **New self-hosted runner** → Windows / x64. Run the
   commands it shows in PowerShell, in a folder such as `C:\actions-runner`.
3. When `config.cmd` asks for extra labels, enter `nela-rera`. Say **Y** to running it as a service
   so it starts with Windows.
4. Settings → Actions → General → "Approval for running fork pull request workflows": choose
   **Require approval for all external contributors**, so nobody else's code runs on your PC.
5. Actions → **RERA crawl** → Run workflow, to test it. The first run checks every project's list
   entry; later runs fetch only projects that changed, at one page every 3 seconds.

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
4. Set up the crawl runner (above) so RERA data stays current.
