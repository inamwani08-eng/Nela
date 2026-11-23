// Fill in coordinates RERA doesn't have (older filings), and locate the
// commute hubs. Results are cached for at most GOOGLE_CACHE_DAYS, per
// Google's terms, then looked up again.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DATA_DIR, GOOGLE_CACHE_DAYS, HUBS, isRelevant } from './config.js';
import { geocode, hasKey, throttle } from './google.js';
import { inBangalore } from './geo.js';

const readJson = (p, f) => readFile(p, 'utf8').then(JSON.parse, () => f);
const fresh = (e) => e && Date.now() - Date.parse(e.fetchedAt) < (GOOGLE_CACHE_DAYS - 2) * 864e5;

async function main() {
  if (!hasKey()) {
    console.log('GOOGLE_MAPS_API_KEY not set; skipping geocoding');
    return;
  }
  await mkdir(join(DATA_DIR, 'google'), { recursive: true });
  const cachePath = join(DATA_DIR, 'google', 'geocode.json');
  const cache = await readJson(cachePath, {});
  // Drop anything past the cache limit.
  for (const k of Object.keys(cache)) if (!fresh(cache[k])) delete cache[k];

  const jobs = HUBS.map((h) => ({ key: `hub:${h.id}`, query: h.query }));
  const { projects } = await readJson(join(DATA_DIR, 'rera-list.json'), { projects: [] });
  for (const p of projects.filter((x) => isRelevant(x))) {
    const d = await readJson(join(DATA_DIR, 'details', `${p.reraId}.json`), null);
    if (!d) continue;
    if (d.lat && d.lng && inBangalore(d.lat, d.lng)) continue;
    const addr = [d.address, p.taluk, 'Bengaluru', 'Karnataka', d.pin].filter(Boolean).join(', ');
    jobs.push({ key: `p:${p.reraId}`, query: addr, fallback: `${p.name}, ${p.taluk}, Bengaluru` });
  }

  let looked = 0;
  for (const j of jobs) {
    if (fresh(cache[j.key])) continue;
    try {
      let r = await geocode(j.query);
      if ((!r || !inBangalore(r.lat, r.lng)) && j.fallback) r = await geocode(j.fallback);
      cache[j.key] = { fetchedAt: new Date().toISOString(), ...(r && inBangalore(r.lat, r.lng) ? r : { miss: true }) };
    } catch (e) {
      console.warn(`  ${j.key}: ${e.message}`);
      if (/REQUEST_DENIED|OVER_QUERY_LIMIT/.test(e.message)) break;
    }
    if (++looked % 100 === 0) console.log(`  geocoded ${looked}`);
    await throttle();
  }
  await writeFile(cachePath, JSON.stringify(cache));
  console.log(`Geocoding done: ${looked} lookups, ${Object.keys(cache).length} cached`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
