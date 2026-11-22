// Match each project to its Google place (for reviews) and find metro
// stations. Only place IDs are stored long term, which Google allows; the
// site fetches ratings and reviews live so they're always current and
// shown with Google's attribution. Station coordinates are cached for at
// most GOOGLE_CACHE_DAYS.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DATA_DIR, GOOGLE_CACHE_DAYS, isRelevant } from './config.js';
import { hasKey, textSearch, throttle } from './google.js';
import { km, inBangalore } from './geo.js';

const readJson = (p, f) => readFile(p, 'utf8').then(JSON.parse, () => f);
const fresh = (e, days) => e && Date.now() - Date.parse(e.fetchedAt) < days * 864e5;

const norm = (s) => (s || '').toLowerCase().replace(/phase\s*\w+|tower\s*\w+|block\s*\w+|wing\s*\w+|\(.*?\)/g, ' ').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['the', 'and', 'apartment', 'apartments', 'residency', 'project', 'bangalore', 'bengaluru'].includes(w));

/** Share of the project's name words that appear in the place's name. */
export function nameMatch(projectName, placeName) {
  const a = norm(projectName);
  const b = new Set(norm(placeName));
  if (!a.length) return 0;
  return a.filter((w) => b.has(w)).length / a.length;
}

async function matchProjects(coords) {
  const path = join(DATA_DIR, 'google', 'places.json');
  const cache = await readJson(path, {});
  const { projects } = await readJson(join(DATA_DIR, 'rera-list.json'), { projects: [] });
  let n = 0;
  for (const p of projects.filter((x) => isRelevant(x))) {
    const c = coords.get(p.reraId);
    // Re-check matches yearly, misses monthly.
    const prev = cache[p.reraId];
    if (prev && fresh(prev, prev.placeId ? 365 : 30)) continue;
    if (!c) continue;
    try {
      const j = await textSearch(
        {
          textQuery: `${p.name} ${p.taluk.replace('Bengaluru ', '')} Bengaluru`,
          locationBias: { circle: { center: { latitude: c.lat, longitude: c.lng }, radius: 2000 } },
          pageSize: 5,
        },
        'places.id,places.displayName,places.location',
      );
      const best = (j.places || [])
        .map((pl) => ({ id: pl.id, score: nameMatch(p.name, pl.displayName?.text), dist: km(c, { lat: pl.location.latitude, lng: pl.location.longitude }) }))
        .filter((x) => x.score >= 0.5 && x.dist <= 1.5)
        .sort((x, y) => y.score - x.score || x.dist - y.dist)[0];
      // Only the ID is kept. No match means the site shows "no reviews yet".
      cache[p.reraId] = { fetchedAt: new Date().toISOString(), placeId: best ? best.id : null };
    } catch (e) {
      console.warn(`  ${p.reraId}: ${e.message}`);
      if (/PERMISSION_DENIED|RESOURCE_EXHAUSTED/.test(e.message)) break;
    }
    if (++n % 100 === 0) console.log(`  matched ${n}`);
    await throttle();
  }
  await writeFile(path, JSON.stringify(cache));
  const matched = Object.values(cache).filter((x) => x.placeId).length;
  console.log(`Places: ${n} lookups, ${matched} projects with a Google place`);
}

async function metroStations() {
  const path = join(DATA_DIR, 'google', 'metro.json');
  const cache = await readJson(path, null);
  if (cache && fresh(cache, GOOGLE_CACHE_DAYS - 2)) return;
  const stations = new Map();
  // 4 x 4 grid over the metro area; each cell returns up to 60 stations.
  const [s, w, n, e] = [12.75, 77.4, 13.25, 77.85];
  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < 4; k++) {
      const rect = {
        low: { latitude: s + ((n - s) * i) / 4, longitude: w + ((e - w) * k) / 4 },
        high: { latitude: s + ((n - s) * (i + 1)) / 4, longitude: w + ((e - w) * (k + 1)) / 4 },
      };
      let pageToken;
      do {
        const j = await textSearch(
          { textQuery: 'Namma Metro station', includedType: 'subway_station', locationRestriction: { rectangle: rect }, pageSize: 20, pageToken },
          'places.id,places.displayName,places.location,nextPageToken',
        );
        for (const pl of j.places || []) {
          const lat = pl.location.latitude;
          const lng = pl.location.longitude;
          if (inBangalore(lat, lng)) stations.set(pl.id, { name: pl.displayName.text.replace(/\s*metro station\s*/i, '').trim(), lat: +lat.toFixed(5), lng: +lng.toFixed(5) });
        }
        pageToken = j.nextPageToken;
        await throttle(400);
      } while (pageToken);
    }
  }
  await writeFile(path, JSON.stringify({ fetchedAt: new Date().toISOString(), stations: [...stations.values()] }));
  console.log(`Metro: ${stations.size} stations`);
}

async function main() {
  if (!hasKey()) {
    console.log('GOOGLE_MAPS_API_KEY not set; skipping place matching');
    return;
  }
  await mkdir(join(DATA_DIR, 'google'), { recursive: true });
  const geo = await readJson(join(DATA_DIR, 'google', 'geocode.json'), {});
  const { projects } = await readJson(join(DATA_DIR, 'rera-list.json'), { projects: [] });
  const coords = new Map();
  for (const p of projects.filter((x) => isRelevant(x))) {
    const d = await readJson(join(DATA_DIR, 'details', `${p.reraId}.json`), null);
    if (d && d.lat && inBangalore(d.lat, d.lng)) coords.set(p.reraId, { lat: d.lat, lng: d.lng });
    else if (geo[`p:${p.reraId}`]?.lat) coords.set(p.reraId, geo[`p:${p.reraId}`]);
  }
  await metroStations();
  await matchProjects(coords);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
